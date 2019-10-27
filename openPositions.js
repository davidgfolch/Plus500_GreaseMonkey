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
let divTooltip='#tooltip';

let colorsRunning=false;
let maxNetValueAverageItems=60000*5/colorsTimeout; //remembers 5 minutes of data
let netValues=[];  //todo remove newValues & use netValuesAverage?
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
        clearInterval(colorsIntervalId);
        clearInterval(sortIntervalId);
        let newClass=$(this).attr('class');
        if (newClass===orderClass) orderAsc=!orderAsc;
        orderClass=newClass;
        // netValues=[];
        // netValuesAverage=[];
        reorderRows=true;
        sortRunning=true;
        colorsRunning=false;
        sort();
        sortSetInterval();
        colors();
    });
}

function sortSetInterval() {
    sortIntervalId = window.setInterval(sort, 500);
}
function sort() {
    sortRunning=false;
    if (reorderRows && !colorsRunning) {
        sortRunning=true;
        reorderRows=false;
        let orderedDivs = $(divPosition).sort(function (a, b) {
            let value1 = $(a).find('div.' + orderClass).text();
            let value2 = $(b).find('div.' + orderClass).text();
            if (num(value2)) return orderAsc ? num(value2) > num(value1) : num(value1) > num(value2);
            else return orderAsc ? value2 > value1 : value1 > value2;
        });
        $(divPositions).html(orderedDivs);
        let newArr=[];
        $(divPositions + ' .position').each(function (pos, divElm) {
            netValuesAverage.forEach(function (arrElm) {
                if ($(divElm).attr('id') === arrElm.id) {
                    newArr.push(arrElm);
                }
            });
        });
        netValuesAverage=newArr;
        netValues=netValuesAverage.map(function(x) { return x.arr[x.arr.length-1]});
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
        //if list size changes reset averages (new or removed position)
        if ($(divPosition).length!==netValues.length) { //todo insert or remove positions in arrays
            netValues=[];
            netValuesAverage=[];
        }
        $(divPosition).each(function(i, el) {
            let netPl=$(el).find(divNet);
            let newValue=float2int(num($(netPl).text()));
            if (typeof netValues[i] != 'undefined') { //row now found
                let type=$(el).find('div.type');
                let avArr=netValuesAverage[i].arr;
                if (avArr.length>maxNetValueAverageItems)
                    avArr=avArr.shift();
                avArr.push(newValue);
                let avValue=avArray(avArr);
                let oldValue=netValues[i];

                let buySell=$(type).find('> span').text().substring(0,1);  //todo move buySell transform to initialization
                let newAvPrice=' ('+buySell+') av. '+avValue+' €';
                let avPriceNode='<span style="font-size: x-small"> '+newAvPrice+'</span>';
                let avPriceElm=$(type).find('strong > span');
                if (!$(avPriceElm).length) $(type).find('strong').append(avPriceNode);
                else $(avPriceElm).text(newAvPrice);

                $(type).mousemove(function(event) {  //todo move to initialization
                    drawTooltip(event,avArr.join(", "));  //todo when reorder, average list should be reordered too.  Or use a map for prices array to link to position id.
                    tooltipRow=i;
                });
                if (i===tooltipRow)
                    updateTooltip(avArr.join(", "));
                $(type).mouseout(function() { //todo move to initialization
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
    if ($(divTooltip).length) $(divTooltip).remove();
    $('<div />',{'id': 'tooltip'})
        .css({'position': 'absolute', 'left': e.pageX+10, 'top': e.pageY+10, 'background': 'rgba(100,100,100,0.7)', 'font-size': 'x-small', 'padding': '1em 1em 1em 1em', 'border': '1px solid white', 'display': 'inline-block', 'max-width': '80%'})
        .html(html)
        .appendTo('body');
}
function updateTooltip(html){
    if ($(divTooltip).length)
        $(divTooltip).html(html);
}
function removeTooltip(){
    $(divTooltip).remove();
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
            //console.log("init");

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
