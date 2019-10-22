/* GreeaseMonkey for Plus500/open-positions */

var enabled=true;
var colorsInterval;
var orderInterval;
var checkExistPositions;
var orderClass='net-pl';
var orderAsc=true;

runAll();

function runAll() {
  order();
  colors();
  extraMenu();
  columnOrderClick();
  setStyles();
}

/* Order table by columns on click */
function columnOrderClick() {
  var checkExist = setInterval(function() {
    if ($('#openPositions .section-table-head div div').length) {
      clearInterval(checkExist);
      $('#openPositions .section-table-head div div').click(function() {
        var newClass=$(this).attr('class');
        if (newClass==orderClass) orderAsc=!orderAsc;
        orderClass=newClass;
      });
    }
  }, 250);
}

function order() {
  orderInterval = window.setInterval(function(){
    var alphabeticallyOrderedDivs = $("#openPositionsRepeater .position").sort(function (a, b) {
      var value1=$(a).find('div.'+orderClass).text();
      var value2=$(b).find('div.'+orderClass).text();
      if (num(value2)) return orderAsc?num(value2)>num(value1):num(value1)>num(value2);
      else return orderAsc?value2>value1:value1>value2;
    });
    $("#openPositionsRepeater").html(alphabeticallyOrderedDivs);    
  }, 500);
}

function num(x) {
  //console.log(x);
  var text=x.replace(/[^0-9,-]+/g,"").replace(/,/g, '.').split(" ")[0].trim();
  //console.log("test="+x);
  var number = parseFloat(text);
  //console.log("number="+number);
  return number;
}

var netValues=[];

function colors() {
  colorsInterval = window.setInterval(function(){
    //console.log("Pluss 500 position highlighter run time out ----------------------------------------------------------------");
    $("#openPositionsRepeater .position").each(function(i, el) {
      //console.log("checkPrices, forEach "+elmId);
      var newValue=num($(el).find('div.net-pl').text());
      if (typeof netValues[i] != 'undefined') {
        var oldValue=netValues[i];
        //console.log("oldValue="+oldValue);
        //console.log("newValue="+newValue);
        if (newValue==oldValue) {
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
  var checkExist = setInterval(function() {
    if ($('ul#navigation li').length) {
      clearInterval(checkExist);
      $('ul#navigation').append('<li><a id="extrasNav" class="navigation icon-bars" data-nav="Extras"><span data-nav="Extras" data-win-res="{textContent: \'strExtras\'}">Extras</span></a></li>');
      $('div#trading-group').change(function() {
        console.log("a#openPositionsNav.click");
        setStyles();
      });
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
  }, 250);
}

/* Narrowing line height */
function setStyles() {
  checkExistPositions = setInterval(function() {
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
