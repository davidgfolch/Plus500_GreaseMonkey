// ==UserScript==
// @name     Plus500 position order
// @version  1
// @grant    none
// @require  https://code.jquery.com/jquery-3.4.1.js
// ==/UserScript==

/* GreaseMonkey for https://app.plus500.com/open-positions */

//todo after some running time, disappears last rows mouseover average info

let enabled=true;
let colorsIntervalId=0;
let colorsTimeout=1000;
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
let netValuesAverageMinutes=10;
let maxNetValueAverageItems=60000*netValuesAverageMinutes/colorsTimeout; //remembers netValuesAverageMinutes minutes of data
let tooltipTitle="<strong>Media aritm&eacute;tica de &uacute;ltimos "+netValuesAverageMinutes+" minutos: </strong>";
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
    $(divHeader).on("click", function() {
        clearInterval(colorsIntervalId);
        clearInterval(sortIntervalId);
        let newClass=$(this).attr('class');
        if (newClass===orderClass) orderAsc=!orderAsc;
        orderClass=newClass;
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

                let imgAverageSymbol='<img src="https://wikimedia.org/api/rest_v1/media/math/render/svg/9fa4039bbc2a0048c3a3c02e5fd24390cab0dc97"' +
                    ' aria-hidden="true" style="vertical-align: -0.338ex; width:1.445ex; height:2.343ex" alt=""> = ';
                let newAvPrice=''+imgAverageSymbol+' '+avValue+' €';
                let avPriceNode='<span style="font-size: small; border: 1px solid gray; float: right; background-color: lightgray; color: black"> '+newAvPrice+'</span>';
                let avPriceElm=$(type).find('strong > span');
                if (!$(avPriceElm).length) $(type).find('strong').append(avPriceNode);
                else $(avPriceElm).html(newAvPrice);

                if (i===tooltipRow)
                    updateTooltip( tooltipTitle+avArr.join(", "));
                $(type).on("mousemove", function(event) {
                    drawTooltip(event, tooltipTitle+avArr.join(", "));
                    tooltipRow=i;
                });
                $(type).on("mouseout",function() {
                    removeTooltip();
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
        .on("mouseout", function() {
            removeTooltip();
        })
        .appendTo('body');
}
function updateTooltip(html){
    if ($(divTooltip).length)
        $(divTooltip).html(html);
}
function removeTooltip(){
    $(divTooltip).remove();
    tooltipRow=-1;
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
            $('#openPositionsNav').on("click", function(){
                init();
            });
            if ($(myMenuSel).length===0) {
                $(navigation).append(myMenuHtml);
                $(myMenuSel).on("click",function() {
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
            //$('ChartResolutionMenu')

            sort();
            setStyles();
            colors();
            extraMenu();
            columnOrderClick();
            shortCuts();
            sortSetInterval();

            $(divPosition).each(function(i, el) {
                let type=$(el).find('div.type');
                if (!$(type).find('strong div').length) {
                    let buySell=$(type).find('> span').text().substring(0,1);
                    $(type).find('strong').prepend('<div style="float: left; margin: 0; padding 0; font-size: x-small">('+buySell+')</div>');
                }
                $(type).on("mouseout",function() {
                    removeTooltip();
                });
            });

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
    $('div.net-pl').css({
        'text-align': 'right'
    });
    $('div.value').css({
        'text-align': 'right'
    });
    $('div.change').css({
        'text-align': 'right'
    });
    $('div.adjustments').css({
        'text-align': 'right'
    });
    $('div.premium').css({
        'text-align': 'right'
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
