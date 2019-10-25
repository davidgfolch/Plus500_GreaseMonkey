// ==UserScript==
// @name     Plus500 position order
// @version  1
// @grant    none
// @require  https://code.jquery.com/jquery-3.4.1.js
// ==/UserScript==

/* GreaseMonkey for https://app.plus500.com/open-positions */

let enabled=true;
let colorsInterval;
let colorsTimeout=500;
let orderInterval;
let reorderRows=true;
let orderClass='net-pl';
let orderAsc=true;

let divPositions="#openPositionsRepeater";
let divPosition=divPositions+" .position";
let divNet="div.net-pl";
let maxNetValueAverageItems=60000*10/colorsTimeout; //remembers 10 minutes of data

runAll();

function runAll() {
    init();
    order();
    colors();
    extraMenu();
    columnOrderClick();
    shortCuts();
}

const divHeader='#openPositions .section-table-head div div';
/* Order table by columns on click */
function columnOrderClick() {
    let checkExist = setInterval(function() {
        if ($(divHeader).length) {
            clearInterval(checkExist);
            $(divHeader).click(function() {
                let newClass=$(this).attr('class');
                if (newClass===orderClass) orderAsc=!orderAsc;
                orderClass=newClass;
                reorderRows=true;
            });
        }
    }, 250);
}

function order() {
    orderInterval = window.setInterval(function(){
        if (reorderRows) {
            reorderRows=false;
            let orderedDivs = $(divPosition).sort(function (a, b) {
                let value1=$(a).find('div.'+orderClass).text();
                let value2=$(b).find('div.'+orderClass).text();
                if (num(value2)) return orderAsc?num(value2)>num(value1):num(value1)>num(value2);
                else return orderAsc?value2>value1:value1>value2;
            });
            $(divPositions).html(orderedDivs);
            // $(divPosition).each(function(i, el) {
            //     netValues[i]=float2int(num($(el).find(divNet).text()));
            // });
        }
    }, 1000);
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

let netValues=[];
let netValuesAverage=[];

function colors() {
    colorsInterval = window.setInterval(function(){
        $(divPosition).each(function(i, el) {
            let netPl=$(el).find(divNet);
            let newValue=float2int(num($(netPl).text()));
            if (typeof netValues[i] != 'undefined') {
                let type=$(el).find('div.type');
                if (netValuesAverage[i].length>maxNetValueAverageItems) {
                    netValuesAverage[i]=netValuesAverage[i].splice(1);
                }
                netValuesAverage[i].push(newValue);
                let avValue=avArray(netValuesAverage[i]);
                let oldValue=netValues[i];
                // if ($(type).text().indexOf('EUR/USD')!==-1 || $(type).text().indexOf('US-TECH 100')!==-1) {
                //     console.log($(type).text()+" av="+avValue+"\tvalues="+netValuesAverage[i]);
                // }

                //$(type).text($(type).text().replace(/Comprar/g,'C').replace(/Vender/g,'V').replace(/ average=.*/g,'')+' average='+avValue);
                $(type).html($(type).html().replace(/(<small> \(av\..+\)<\/small>)?<\/strong>/g,'')+' <small> (av. '+avValue+' €)</small></strong>');
                setColor(type,avValue,newValue);
                setColor(netPl,oldValue,newValue,true);
            } else netValuesAverage[i]=[newValue];
            netValues[i]=newValue;
        });
    }, colorsTimeout);
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
    $(el).css({"color":"","background":""});
}
function colorGreen(el,alpha) {
    colorBgAlpha(el, '', '#005500', alpha);
}
function colorRed(el, alpha) {
    colorBgAlpha(el, '', '#ff0000', alpha);
}
function colorBgAlpha(el, color, bg, alpha) {
    let rgbaCol = 'rgba(' + parseInt(bg.slice(-6,-4),16)
        + ',' + parseInt(bg.slice(-4,-2),16)
        + ',' + parseInt(bg.slice(-2),16)
        +','+alpha+')';
    $(el).css({"color":color,"background":rgbaCol});
}

let navigation='ul#navigation';
let myMenuId='extrasNav';
let myMenuSel='#'+myMenuId;
let myMenuHtml='<li><a id="'+myMenuId+'" class="navigation icon-bars" data-nav="Extras"><span data-nav="Extras" data-win-res="{textContent: \'strExtras\'}">Extras</span></a></li>';

function extraMenu() {
    let checkExist = setInterval(function() {
        if ($(navigation+' li').length) {
            clearInterval(checkExist);
            $('#openPositionsNav').click(function(){
                runAll();
            });
            if ($(myMenuSel).length===0) {
                $(navigation).append(myMenuHtml);
                $(myMenuSel).click(function() {
                    enabled=!enabled;
                    if (enabled) {
                        runAll();
                    } else {
                        clearInterval(orderInterval);
                        clearInterval(colorsInterval);
                        $(divPosition).each(function(i, el) {
                            colorBgAlpha(el,'');
                        });
                    }
                });
            }
        }
    }, 250);
}

/* Narrowing line height */
function init() {
    let checkExistPositions = setInterval(function() {
        if ($('#openPositions div.position').length) {
            clearInterval(checkExistPositions);

            //$('ChartResolutionMenu')
            setStyles();

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
