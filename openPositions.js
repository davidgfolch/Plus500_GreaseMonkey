// ==UserScript==
// @name     Plus500 position order
// @version  1
// @grant    none
// @require  https://code.jquery.com/jquery-3.4.1.js
// ==/UserScript==

/* GreaseMonkey for Plus500/open-positions */

let enabled=true;
let colorsInterval;
let orderInterval;
let orderClass='net-pl';
let orderAsc=true;

runAll();

function runAll() {
  order();
  colors();
  extraMenu();
  columnOrderClick();
  setStyles();
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
      });
    }
  }, 250);
}

function order() {
  orderInterval = window.setInterval(function(){
    let alphabeticallyOrderedDivs = $("#openPositionsRepeater .position").sort(function (a, b) {
      let value1=$(a).find('div.'+orderClass).text();
      let value2=$(b).find('div.'+orderClass).text();
      if (num(value2)) return orderAsc?num(value2)>num(value1):num(value1)>num(value2);
      else return orderAsc?value2>value1:value1>value2;
    });
    $("#openPositionsRepeater").html(alphabeticallyOrderedDivs);
  }, 500);
}

function num(x) {
  //console.log(x);
  let text=x.replace(/[^0-9,-]+/g,"").replace(/,/g, '.').split(" ")[0].trim();
  //console.log("text="+x);
  //console.log("number="+parseFloat(text));
  return parseFloat(text);
}

let netValues=[];

function colors() {
  colorsInterval = window.setInterval(function(){
    //console.log("Pluss 500 position highlighter run time out ----------------------------------------------------------------");
    $("#openPositionsRepeater .position").each(function(i, el) {
      //console.log("checkPrices, forEach "+elmId);
      let newValue=num($(el).find('div.net-pl').text());
      if (typeof netValues[i] != 'undefined') {
        let oldValue=netValues[i];
        //console.log("oldValue="+oldValue);
        //console.log("newValue="+newValue);
        if (newValue===oldValue) {
          color(el,'');
        } else {
          if (newValue>oldValue) {
            color(el,'#330000aa');
          } else {
            color(el,'#003300aa');
          }
        }
      }
      netValues[i]=newValue;
    });
  }, 400);
}

function color(el,color) {
  $(el).css('background', color);
}

function extraMenu() {
  let checkExist = setInterval(function() {
    if ($('ul#navigation li').length) {
      clearInterval(checkExist);
      $('#openPositionsNav').click(function(){
          setStyles();
      });
      if ($('#extrasNav').length===0) {
          $('ul#navigation').append('<li><a id="extrasNav" class="navigation icon-bars" data-nav="Extras"><span data-nav="Extras" data-win-res="{textContent: \'strExtras\'}">Extras</span></a></li>');
          $('a#extrasNav').click(function() {
              enabled=!enabled;
              if (enabled) {
                  runAll();
              } else {
                  clearInterval(orderInterval);
                  clearInterval(colorsInterval);
                  $("#openPositionsRepeater .position").each(function(i, el) {
                      color(el,'');
                  });
              }
          });
      }
    }
  }, 250);
}

/* Narrowing line height */
function setStyles() {
    let checkExistPositions = setInterval(function() {
    if ($('#openPositions div.position').length) {
      clearInterval(checkExistPositions);
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
  }, 300);
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
