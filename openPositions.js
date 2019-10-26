// ==UserScript==
// @name     Plus500 position order
// @version  1
// @grant    none
// @require  https://code.jquery.com/jquery-3.4.1.js
// ==/UserScript==

/* GreaseMonkey for https://app.plus500.com/open-positions */

let enabled=true;
let colorsIntervalId=0;
let colorsTimeout=500;
let sortIntervalId;
let reorderRows=true;
let orderClass='net-pl';
let orderAsc=true;
let sortRunning=false;

let divPositions="#openPositionsRepeater";
let divPosition=divPositions+" .position";
let divNet="div.net-pl";

let colorsRunning=false;
let maxNetValueAverageItems=60000*5/colorsTimeout; //remembers 5 minutes of data
let netValues=[];
let netValuesAverage=[];
let tooltipRow=-1;

let navigation='ul#navigation';
let myMenuId='extrasNav';
let myMenuSel='#'+myMenuId;
let myMenuHtml='<li><a id="'+myMenuId+'" class="navigation icon-bars" data-nav="Extras"><span data-nav="Extras" data-win-res="{textContent: \'strExtras\'}">Extras</span></a></li>';

init();

const divHeader='#openPositions .section-table-head div div';
/* Order table by columns on click */
function columnOrderClick() {
    $(divHeader).click(function() {
        clearInterval(colorsTimeout);
        sortRunning=true;
        let newClass=$(this).attr('class');
        if (newClass===orderClass) orderAsc=!orderAsc;
        orderClass=newClass;
        reorderRows=true;
        netValues=[];
        netValuesAverage=[];
        colorsRunning=false;
        sort();
    });
}

function sortSetInterval() {
    sortIntervalId = window.setInterval(sort, 500);
}
function sort() {
    console.log("sort");
    sortRunning=false;
    if (reorderRows && !colorsRunning) {
        console.log("sort inside");
        sortRunning=true;
        reorderRows=false;
        let orderedDivs = $(divPosition).sort(function (a, b) {
            let value1 = $(a).find('div.' + orderClass).text();
            let value2 = $(b).find('div.' + orderClass).text();
            if (num(value2)) return orderAsc ? num(value2) > num(value1) : num(value1) > num(value2);
            else return orderAsc ? value2 > value1 : value1 > value2;
        });
        $(divPositions).html(orderedDivs);
        let newArr = netValuesAverage.slice();
        $(divPositions + ' .position').each(function (divIdx, divElm) {
            console.log("reorder net netValuesAverage - divPosition=" + divIdx + " divElmId=" + $(divElm).attr('id'));
            netValuesAverage.sort(function (arrElm) {
                if ($(divElm).attr('id') === arrElm.id) {
                    console.log("reorder net netValuesAverage - setting new Array for id=" + arrElm.id);
                    newArr[divIdx] = arrElm.clone();
                }
            });
        });
        netValuesAverage=newArr;
        console.log("sort exit");
        sortRunning=false;
    }
}

function num(x) {
    let text=x.replace(/[^0-9,-]+/g,"").replace(/,/g, '.').split(" ")[0].trim();
    return parseFloat(text);
}
function avArray(arr) {
    return float2int(arr.reduce(function(a, b) { return a + b; }) / arr.length);
}
function float2int(value) {
    // let str=''+value;
    // let cut=str.substring(0,str.indexOf('\.'));
    // //console.log("value to string="+str+"\tcut="+cut);
    // return parseInt(cut);
    // //return Math.round(value);
    return value | 0;
}

function colors() {
    colorsIntervalId = window.setInterval(function(){
        colorsRunning=false;
        if (sortRunning) return;
        colorsRunning=true;
        $(divPosition).each(function(i, el) {
            let netPl=$(el).find(divNet);
            let newValue=float2int(num($(netPl).text()));
            if (typeof netValues[i] != 'undefined') {
                let type=$(el).find('div.type');
                let avArr=netValuesAverage[i].arr;
                if (avArr.length>maxNetValueAverageItems)
                    avArr=avArr.shift();
                avArr.push(newValue);
                let avValue=avArray(avArr);
                let oldValue=netValues[i];
                $(type).html($(type).html().replace(/(<small [^>]+> \(av\..+\)<\/small>)?<\/strong>/g,'')
                    +' <small id="averagePrices"> (av. '+avValue+' €)</small></strong>');

                $(type).mousemove(function(event) {
                    drawTooltip(event,avArr.join(", "));  //todo when reorder, average list should be reordered too.  Or use a map for prices array to link to position id.
                    tooltipRow=i;
                });
                if (i===tooltipRow)
                    updateTooltip(avArr.join(", "));
                $(type).mouseout(function() {
                    removeTooltip();
                    tooltipRow=-1;
                });
                setColor(type,avValue,newValue);
                setColor(netPl,oldValue,newValue,true);
            } else netValuesAverage[i]={ id: $(el).attr("id"), arr: [newValue] };
            netValues[i]=newValue;
        });
        colorsRunning=false;
    }, colorsTimeout);
}

function drawTooltip(e,html){
    if ($('#tooltip').length) $('#tooltip').remove();
    $('<div />',{'id': 'tooltip'})
        .css({'position': 'absolute', 'left': e.pageX+10, 'top': e.pageY+10, 'background': 'rgba(100,100,100,0.5)', 'padding': '1em 1em 1em 1em', 'border': '1px solid white', 'display': 'inline-block', 'max-width': '50%'})
        .html(html)
        .appendTo('body');
}
function updateTooltip(html){
    if ($('#tooltip').length)
        $('#tooltip').html(html);
}
function removeTooltip(){
    $('#tooltip').remove();
}

function setColor(el,oldValue,newValue,setReorderRows) {
    if (oldValue===newValue) {
        colorReset(el);
        return;
    }
    if (setReorderRows) reorderRows=true;
    let strong=Math.abs(oldValue-newValue)>100;
    if (newValue>oldValue) colorGreen(el,strong?0.6:0.3);
    else colorRed(el,strong?'0.6':'0.3');
}
function colorReset(el) {
    $(el).css('background','');
}
function colorGreen(el,alpha) {
    colorBgAlpha(el,'#005500', alpha);
}
function colorRed(el, alpha) {
    colorBgAlpha(el,'#ff0000', alpha);
}
function colorBgAlpha(el, bgColor, alpha) {
    let rgbaCol = 'rgba(' + parseInt(bgColor.slice(-6,-4),16)
        + ',' + parseInt(bgColor.slice(-4,-2),16)
        + ',' + parseInt(bgColor.slice(-2),16)
        +','+alpha+')';
    $(el).css('background',rgbaCol);
}

function extraMenu() {
    let checkExist = setInterval(function() {
        if ($(navigation+' li').length) {
            clearInterval(checkExist);
            $('#openPositionsNav').click(function(){
                init();
            });
            if ($(myMenuSel).length===0) {
                $(navigation).append(myMenuHtml);
                $(myMenuSel).click(function() {
                    enabled=!enabled;
                    if (enabled) {
                        init();
                    } else {
                        clearInterval(sortIntervalId);
                        clearInterval(colorsIntervalId);
                        $(divPosition).each(function(i, el) {
                            colorReset(el);
                        });
                    }
                });
            }
        }
    }, 250);
}


function init() {
    let intervalId = setInterval(function() {
        if ($(divPosition).length) {
            clearInterval(intervalId);
            console.log("init");

            //$('ChartResolutionMenu')
            sort();
            setStyles();
            colors();
            extraMenu();
            columnOrderClick();
            shortCuts();
            sortSetInterval();


            //move column
            // $(divPosition+' .edit-position').each(function(i, el) {
            //   console.log("moving... e"+el);
            //   let parent=$(el).parent();
            //   console.log("parent... e"+$(parent));
            //   let first=$(parent).find('div.type');
            //   console.log("first... e"+$(first));
            //   first.prepend($(el).remove());
            // });
        }
    }, 300);
}

/* Narrowing line height */
function setStyles() {
    $('div.position').css({
        "font-weight": "normal",
        "padding": "0px 0px 0px 0px"
    });
    $('div.position div.type span').css({
        "display": "none"
    });
    $('div.limit-stop').css({
        "display": "none"
    });
    $('div.position div.actions button').css({
        "display": "none",
        "visibility": "hidden",
        "height": "0px"
    });
    $('.open-time :nth-child(2)').css({
        "display": "none"
    });
}

function shortCuts() {
    // console.log("shortCuts");
    // $(function() {
    //   // Handler for $('document').ready() called.
    //   $(document).keydown(function (e) {
    //     console.log("e.which="+e.which);
    //     console.log("e.ctrlKey="+e.ctrlKey);
    //     if (e.ctrlKey) {
    //       switch (e.which) {
    //         case 37: //left
    //             console.log("zoom Out");
    //             let next=$('.ciq-active').next();
    //             console.log("zoom Out 1 next="+next);
    //             $(next).click();
    //             console.log("zoom Out 2");
    //             // else
    //             //$('.ciq-active').removeClass('ciq-active');
    //             console.log("zoom Out 2");
    //             // $(next).class('cq-item.ciq-active');
    //             // console.log("zoom Out 3");
    //             // $('div#chartSize #zoomOut').click(); break;  //todo dont work
    //         case 39: //right
    //             console.log("zoom In");
    //             $$('#ChartResolutionMenu').click(); //todo dont work
    //             $('div#chartSize #zoomIn').click(); break;  //todo dont work
    //       }
    //     }
    //   });
    // });
}
