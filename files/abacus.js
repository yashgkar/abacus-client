/*
 * @(#)abacus.js
 *
 * Copyright 2015 - 2020  David A. Bagley, bagleyd AT verizon.net
 *
 * All rights reserved.
 *
 * Permission to use, copy, modify, and distribute this software and
 * its documentation for any purpose and without fee is hereby granted,
 * provided that the above copyright notice appear in all copies and
 * that both that copyright notice and this permission notice appear in
 * supporting documentation, and that the name of the author not be
 * used in advertising or publicity pertaining to distribution of the
 * software without specific, written prior permission.
 *
 * This program is distributed in the hope that it will be "useful",
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */

// https://www.sillycycle.com/abacus.html
// Got started with this great page...
// http://diveintohtml5.info/examples/canvas-halma.html

/* global Audio */
"use strict";

var MIN_RAILS = 1;
var MIN_DEMO_RAILS = 3;
var DEFAULT_RAILS = 13;
var DEFAULT_TOP_SPACES = 2;
var DEFAULT_BOTTOM_SPACES = 2;
var DEFAULT_TOP_NUMBER = 2;
var DEFAULT_BOTTOM_NUMBER = 5;
var DEFAULT_TOP_FACTOR = 5;
var DEFAULT_BOTTOM_FACTOR = 1;
var DEFAULT_TOP_ORIENT = true;
var DEFAULT_BOTTOM_ORIENT = false;
var DEFAULT_SIGN = false;
var DEFAULT_DECIMAL_POSITION = 2;
var DEFAULT_DECIMAL_DIGITS = 16; //?
var MIN_BASE = 2; // Base 1 is ridiculous :)
var MAX_BASE = 36; // 10 numbers + 26 letters (ASCII)
var DEFAULT_BASE = 10;
var ROMANFRACTIONBASE = 12;
var ALTROMANFRACTIONBASE = 8;
var DEFAULT_SUBDECKS = 3;
var DEFAULT_SUBBEADS = 4;
var DEFAULT_SHIFT_PERCENT = 2;
var DEFAULT_SHIFT_ANOMALY = 2;
var DEFAULT_GROUP_SIZE = 3;
var SUBDECK_SPACES = 1;
var SUBBASE_EIGHTHS = 8;
var SUBBASE_TWELFTHS = 12;
var MAX_MUSEUMS = 3;
var COLOR_MIDDLE = 1;
var COLOR_FIRST = 2;
var COLOR_HALF = 4;
var COLOR_GROUP = 8;
var BRIGHT_FACTOR = 0.8;
var DARK_FACTOR = 0.75;
var BOTTOM = 0;
var TOP = 1;
var LEE = 3;
var NUMBER_SLICES = 5;
var TEST = false;
var oldDebug = false;
var DEBUG = false;

// Math

/*
Roman Numerals

For letters past M...

Here we have this.teachLower case to represent the letters with bars on top.
Pardon the non-standard notation (case historically was ignored).
Think of it as room to add the line by hand... :)
_
V = v,
_
X = x, etc
It has been suggested to put more bars on top for bigger numbers
but there is no recorded usage of a larger Roman numeral in
Roman times.

In HTML this by using combining diacritical marks: x-bar = x&#772;

An older notation for Roman numerals was represented thus:
( = C, I) = D, (I) = M, I)) = v, ((I)) = x, I))) = l, (((I))) = c,
 _
|X| = m (here for simplicity of display, just displayed as |x| ).

Fractions
12 ounces (uncia) in a as
S = 1/2 ounce
) = 1/4 ounce
Z = 1/12 ounce
*/

/* Fractions of twelfths had these names 0/12 - 12/12 */
var twelfthStrings = ["", "uncia", "sextans", "quadrans",
    "triens", "quincunx", "semis", "septunx",
    "bes", "dodrans", "dextans", "deunix", "as"];
var twelfthGlyphs = ["", "-", "=", "=-", "==", "=-=",
    "S", "S-", "S=", "S=-", "S==", "S=-=", "|"];

var HALF_UNCIA = "semuncia"; /* E, (actually a Greek letter sigma) */
var ONEANDAHALF_UNCIA = "sescuncia"; /* E- */
var halftwelfthStrings = [HALF_UNCIA, ONEANDAHALF_UNCIA];
var halftwelfthGlyphs = ["E", "E-"];

/* Fractions of Uncia had these names, took shortest variant */
var TWELFTH_UNCIA = "semisextula"; /* z (actually,
    a "Z" with a "-" through the middle) AKA dimidia sextula,
    dimidio sextula */
var SIXTH_UNCIA = "sextula"; /* Z */
var QUARTER_UNCIA = "sicilicus"; /* Q (actually a
    backwards C but confusing with ancient Roman numerals) */
var THIRD_UNCIA = "duella"; /* u (actually a Greek
    letter mu), AKA binae sextulae */
var FIVETWELFTHS_UNCIA = "sicilicus sextula"; /* not
    sure if this is best representation */
var EIGHTH_UNCIA = "drachma";
var THREEEIGHTHS_UNCIA = "sicilicus drachma"; /* not
    sure if this is best representation */
/* Combining fractions (not sure how this was done in practice
   but this seems reasonable). Combine with the representation
   for HALF_UNCIA or ONEANDAHALF_UNCIA as required. */
var subtwelfthStrings = ["", TWELFTH_UNCIA, SIXTH_UNCIA,
    QUARTER_UNCIA, THIRD_UNCIA, FIVETWELFTHS_UNCIA];
var subeighthStrings = ["", EIGHTH_UNCIA, QUARTER_UNCIA,
    THREEEIGHTHS_UNCIA];
var subtwelfthGlyphs = ["", "z", "Z", "Q", "u", "QZ"];
var subeighthGlyphs = ["", "t", "Q", "Qt"];
var images;

function div(a, b) {
    return Math.floor(a / b);
}

function mod(a, b) {
    return (a + a * a * b) % b;
}

function char2Int(character) {
    var charValue = ascii(character);

    //log("char"  + charValue +  " ");
    if (charValue >= ascii("0") && charValue <= ascii("9")) {
        charValue -= ascii("0");
    } else if (charValue >= ascii("A") && charValue <= ascii("Z")) {
        charValue += 10 - ascii("A");
    } else if (charValue >= ascii("a") && charValue <= ascii("z")) {
        charValue += 10 - ascii("a");
    } else
        charValue = 36;
    //log("var "  + charValue);
    return charValue;
}

/* Position of decimal point in string */
function getDecimalStringPosition(string) {
    var i;

    for (i = 0; i < string.length; i++) {
        if (string.charAt(i) == '.') {
            return i;
        }
    }
    return i;
}

/* Appends decimal where necessary for consistency */
function decimalSafe(string) {
    var decimal = getDecimalStringPosition(string);

    if (decimal == string.length) {
        string = string.concat('.');
    }
    return string;
}

/* Find decimal place offset given current position */
function decimalPlaceString(string, pos) {
    var i = getDecimalStringPosition(string);

    if (i == string.length || i >= pos)
        i -= (pos + 1);
    else
        i -= pos;
    if (oldDebug)
        log("decimalPlaceString return " +
            i + ": " + string + ", position " + pos);
    return i;
}

/* Find position offset given current place */
function decimalOffsetString(string, place) {
    var i = getDecimalStringPosition(string);

    if (place >= 0)
        i -= (place + 1);
    else
        i -= place;
    return i;
}

function romanFraction(number, base, subnumber, subbase, latin) {
    var gotFraction = false;
    var halfBase = subbase >> 1;
    var fraction = number;
    var subfraction = subnumber;
    var buf = "";

    fraction %= base;
    if (fraction === 1 && subfraction >= halfBase) {
        subfraction -= halfBase;
        if (latin) {
            buf += halftwelfthStrings[1];
            gotFraction = true;
        } else {
            buf += halftwelfthGlyphs[1];
        }
    } else if (fraction > 0) {
        if (latin) {
            buf += twelfthStrings[fraction * div(ROMANFRACTIONBASE, base)];
            gotFraction = true;
        } else {
            buf += twelfthGlyphs[fraction * div(ROMANFRACTIONBASE, base)];
        }
    }
    if (subfraction >= halfBase) {
        subfraction -= halfBase;
        if (latin) {
            if (gotFraction)
                buf += " ";
            buf += halftwelfthStrings[0];
            gotFraction = true;
        } else {
            buf += halftwelfthGlyphs[0];
        }
    }
    if (subfraction !== 0) {
        if (latin) {
            if (gotFraction)
                buf += " ";
            if (subbase === ALTROMANFRACTIONBASE)
                buf += subeighthStrings[subfraction];
            else
                buf += subtwelfthStrings[subfraction];
        } else {
            if (subbase === ALTROMANFRACTIONBASE)
                buf += subeighthGlyphs[subfraction];
            else
                buf += subtwelfthGlyphs[subfraction];
        }
    }
    return buf;
}

function addBackAnomaly(buf, anomaly, shift, base, decimalPoint, decimalPosition) {
    var anom;
    var factor;
    var shiftValue = Math.pow(base, shift);
    var anomalyValue = div((anomaly * shiftValue), base);

    anom = convertToDecimal(base, buf, decimalPoint, decimalPosition);
    factor = anom / (shiftValue - anomalyValue);
    anom = anom + factor * anomalyValue;
    convertFromDecimal(displayBuf, base, anom, true);
}

function zeroFractionalPart(buf) {
    for (var i = 0; i < buf.length; i++) {
        if (buf.charAt(i) == '.') {
            buf = buf.substring(0, i - 1);
            return buf;
        }
    }
    return buf;
}

/* Contract string to remove leading and trailing 0's */
function contractString(string) {
    var offset = getDecimalStringPosition(string);
    var i;

    for (i = 0; i < offset - 1; i++) {
        if (string.charAt(0) == '0')
            string = string.substring(1);
       else if (string.charAt(0) === '-' && string.charAt(1) == '0')
            string = "-".concat(string.substring(2));
        else
            break;
    }
    offset = getDecimalStringPosition(string);
    var length = string.length;
    if (offset < length)
        for (i = length - 1; i > 1; i--) {
            if (string.charAt(i) == '0')
               string = string.substring(0, string.length - 1);
           else
               break;
        }
   if (string.length > 0 && string.charAt(0) == '.') /* normalize */
       string = "0".concat(string);
   return string;
}

function trimString(string) {
    var last;

    string = contractString(string);
    last = string.length - 1;
    if (string.charAt(last) === '.')
        string = string.substring(0, last);
    return string;
}

function stripDecimal(string) {
    var i, found = -1;

    string = string.replace('.', '');
    for (i = 0; i < string.length(); i++)
        if (string.charAt(i) != '0') {
            found = i;
            break;
    }
    if (found == -1) {
        string = "0";
        return;
    }
    if (found == 0)
        return;
    string = string.substring(0, found - 1);
    return string;
}

/* Strip String of trailing len numbers */
function stripString(string, len, steps) {
    var length, i;

    string = trimString(string);
    string = stripDecimal(string);
    length = string.length();
    if (len >= 0) {
        if (length >= len)
            string.setLength(length - len);
    } else {
        /* if negative have to add back */
        if (length < steps) {
            for (i = length; i < steps; i++) {
                string.append("0");
            }
            string.setLength(i);
        }
    }
    if (oldDebug)
        log("stripString: " + string +
                " " + string.length());
}

/* Expand String to fit decimal place */
function expandString(string, place) {
    var offset = getDecimalStringPosition(string);
    var prependOffset = place - offset + 1;
    var appendOffset = offset + 1 - string.length - place;
    var i;

    string = decimalSafe(string);
    if (place >= 0) {
       for (i = 0; i < prependOffset; i++) {
            string = "0".concat(string);
       }
    } else {
       for (i = 0; i < appendOffset; i++) {
             string.concat('0');
       }
    }
    return string;
}

function convertFromDecimal(base, x, fraction, decimalPosition) {
    var string; /* [MAX_VALUE_LENGTH] */
    var localPeriod = false;
    var placesBase;
    var l = 0, i = 0;
    var digit;
    var fractDigits = div(Math.log(Math.pow(DEFAULT_BASE,
        DEFAULT_DECIMAL_DIGITS)), Math.log(base)) + decimalPosition;
    var number = x;
    var factor;
    var exp;
    var outputString = "";

    if (DEBUG)
       log("x =" + x);
    string = number.toString();
    if (string.charAt(i) == '-') {
        outputString = outputString.concat('-');
        l++;
        number = -number;
    }
    while (i < string.length) {
        if (string.charAt(i) === '.') /* DECIMAL_POINT LOCALE C */
            localPeriod = true;
        i++;
    }
    {
        /* Chicken and egg problem:
           rounding might increase placesBase */
        placesBase = div(Math.log(number), Math.log(base));
        fractDigits -= (placesBase + 1);
        /* rounder */ 
        //number += Math.pow(base, (-fractDigits >> 1));
        number = number + Math.pow(base, -fractDigits);
        exp = Math.pow(base, fractDigits);
        if (number < 1) {
            outputString = outputString.concat('0');
            l++;
            factor = div(factor * exp, base) /  exp;
        } else {
            placesBase = div(Math.log(number), Math.log(base));
            factor = Math.pow(base, placesBase);
            placesBase++; /* allow one more for possible */
            factor = factor * base; /* rounding error in log */
            //if (factor != 0) {
            try {
                for (; placesBase >= 0; placesBase--) {
                    digit = div(number, factor);
                    outputString = outputString.concat(
                            digitToChar(digit));
                    l++;
                    number -= factor * digit;
                    factor = div(factor, base);
                }
            } catch(err) {
            }
        }
        /* Convert Fractional Part */
        if (localPeriod && fraction) {
            outputString = outputString.concat(decimalPoint);
            l++;
            try {
                for (placesBase = 1;
                        placesBase <= fractDigits;
                        placesBase++) {
                    digit = div(number, factor);
                    outputString = outputString.concat(
                        digitToChar(digit));
                    l++;
                    number -= factor * digit;
                    factor = div(factor, base);
                }
            } catch(err) {
            }
            while (outputString.charAt(l - 1) === '0')
                l--;
        }
    }
    if (!localPeriod) {
        outputString = outputString.concat('.');
        l++;
    }
    //outputString = outputString.concat('\0');
    if (DEBUG)
        log("outputString =" + outputString);
    return outputString;
}

function convertToDecimal(base, inputString, decimalPoint, decimalPosition) {
    var negative = false;
    var digit;
    var length = 0;
    var number = 0;
    var factor;

    /* Convert Integer Part */
    var k = 0;
    if (inputString.charAt(k) == '-') {
        negative = true;
        k++;
    }
    while (k + length < inputString.length &&
            isDigit(inputString.charAt(k + length))) {
        length++;
    }
    factor = Math.pow(base, length);
    for (; length > 0; length--, k++) {
        digit = charToDigit(inputString.charAt(k));
        factor = div(factor, base); // decimalPosition
        number = number + (factor * digit);
    }

    /* Convert Fractional Part */
    if (k < inputString.length &&
            inputString.charAt(k) == decimalPoint) {
        k++;
        while (k < inputString.length &&
                isDigit(inputString.charAt(k))) {
            digit = charToDigit(inputString.charAt(k));
            factor = div(factor, base); // decimalPosition
            number = number + factor * digit;
            k++;
        }
    }

    if (negative)
        number = number.negate();
    return number;
}

/* Next digit in string according to step */
function nextCharPosition(digitStep, digitCarryStep,
        rightToLeft, string) {
    var n, a;
    var count = string.length - 1;
    var decimalPosition = string.length - 1 -
        getDecimalStringPosition(string);
    var decimal = 0;

    if (oldDebug)
        log("nextCharPosition: " +
            " at step " + digitStep + " in " + string +
            ", digitCarryStep " + digitCarryStep +
            ", r2l " + rightToLeft);
    if (string.length === getDecimalStringPosition(string))
        count = string.length; /* no decimal point */
    n = digitStep;
    if (rightToLeft) {
        if (digitCarryStep !== 0)
            n += (digitCarryStep >> 1);
        if (n >= decimalPosition) {
            decimal++;
        }
        n += decimal;
        a = count - n;
    } else {
        if (digitCarryStep !== 0)
            n += -(digitCarryStep >> 1);
        if (n >= count - decimalPosition) {
            decimal++;
        }
        n += decimal;
        a = n;
    }
    if (oldDebug)
        log("nextCharPosition: " + a +
            " at step " + digitStep + " in " + string +
            ", n " + n + ", decimal " + decimal +
            ", count " + count);
    return a;
}

/* Digit at position in string */
function nextChar(string, pos) {
    var digit;

    if (pos < 0 || pos >= string.length) {
        digit = 0;
    } else {
        digit = charToDigit(string.charAt(pos));
    }
    if (oldDebug)
        log("nextChar: " + digit + " at " +
            pos + " in " + string);
    return digit;
}

/* A little tricky as this is reentrant */
/* Number of steps in addition and subtraction */
function addSteps(string) {
   /* decimal included */
   return string.length - 1;
}

/* Number of multiply steps in multiplication */
function multSteps(aString, bString) {
   /* decimal included */
   return (aString.length - 1) * (bString.length - 1);
}

/* Number of addition  steps in multiplication */
function addMultSteps(aString, bString) {
   /* 2 digits per multiplcation */
   return 2 * multSteps(aString, bString);
}

function ascii(a) {
    return a.charCodeAt(0);
} 

function charToDigit(c) {
    var charValue = ascii(c);
    return (charValue >= ascii("A")) ?
        (charValue - ascii("A") + 10) :
        (charValue - ascii("0"));
}

function digitToChar(d) {
    return ((d >= 10) ? String.fromCharCode(ascii("A") + d - 10) : 
        d.toString());
}

/* Calculation support up to base 20, which historically,
   was the maximum base used.  Babylonians used 60, but was a
   conglomeration of base 10 and 6. */
function isDigit(c) {
    var charValue = ascii(c);
    return ((charValue >= ascii("0")
        && charValue <= ascii("9"))
        || (charValue >= ascii("A")
        && charValue <= ascii("J")));
}

function isNumber(c, decimalPoint) {
    return (isDigit(c) || c == decimalPoint);
}

/* true; for period, +/-, or operator */
function isValid(v, b) {
    return ((!isDigit(v)) || (charToDigit(v) < b));
}

function numberWithCommas(x, n) {
    var parts = x.split(".");
    var replace = "\\B(?=(\\d{" + n + "})+(?!\\d))";
    var re = new RegExp(replace, "g");
    parts[0] = parts[0].replace(re, ",");
    return parts.join(".");
}

// find integer root
function rootInt(i, n) {
    var j = 0, k;
    var absI = (i >= 0) ? i : -i;
    var prod;

    if (n < 0 || i === 0 || (n % 2 === 0 && i < 0))
        return 0;
    if (n === 1)
        return i;
    do {
        prod = 1;
        j++;
        for (k = 0; k < n; k++)
            prod *= j;
    } while (prod <= absI);
    return (i === absI) ? (j - 1) : (1 - j);
}

// this tries to find the optimal value for factor of top deck
function convertBaseToBottom(base) {
    for (var j = rootInt(base, 2); j > 1; j--) {
         if (base % j === 0) {
             return div(base, j);
         }
    }
    return base;
}

// regex solutions I saw on web all fail on 1.0
function trimmer(num) {
    if (num.indexOf(".") === -1 || num.indexOf("e-") !== -1) {
        return num;
    }
    for (var i = num.length - 1; i >= 0; i--) {
        if (num.charAt(i) === ".") {
            if (i === 0) {
                return "0";
            } else {
                return num.substring(0, i);
            }
        } else if (num.charAt(i) !== "0") {
             return num.substring(0, i + 1);
        }
    }
    return num;
}

// fixed for different bases
function fixed(num, decimals) {
    var decimalPoint = num.indexOf(".");
    if (decimalPoint === -1 || num.indexOf("e-") !== -1) {
        return num;
    }
    if (num.length - 1 > decimalPoint + decimals + 1)
        return num.substring(0, decimalPoint + decimals + 1);
    return num;
}

var timer;
var delta = 0; // mutex
var animation = true;
//var animation = false;
var fullScreen = false;

var bumpSound, dripSound, moveSound;
if (typeof Audio != undefined) {
    bumpSound = new Audio("bump.wav");
    dripSound = new Audio("drip.wav");
    moveSound = new Audio("move.wav");
}

function log(text) {
    if (window.console && window.console.log) {
        window.console.log(text);
    } else {
        display.innerText = text;
    }
}

function teachMode(popUp) {
    return !(typeof popUp === "undefined" ||  popUp.closed);
}

function railsChange(val) {
    document.getElementById("abacus_rails_number").value = val; // .innerHTML for output
}

function auxiliary0Change(val) {
    document.getElementById("auxiliary0_rails_number").value = val;
}

function auxiliary1Change(val) {
    document.getElementById("auxiliary1_rails_number").value = val;
}

function Bead(deck, rail, cell, index) {
    this.deck = deck;
    this.rail = rail;
    this.cell = cell;
    this.index = index;
}

function Move(aux, deck, rail, number) {
    this.aux = aux;
    this.deck = deck;
    this.rail = rail;
    this.number = number;
}

function Coord(x, y) {
    this.x = x;
    this.y = y;
}

function parse6DigitColor(input) {
    var m = String(input).match(/^#([0-9a-f]{6})$/i)[1];
    if (m) {
        return ((parseInt(m.substr(0, 2), 16) << 16) +
            (parseInt(m.substr(2, 2), 16) << 8) +
            parseInt(m.substr(4, 2), 16));
    }
}

function darker(color) {
    var intColor = parse6DigitColor(color);
    var red = Math.floor((0xff0000 & intColor) * DARK_FACTOR) >> 16;
    red = (red < 16) ? "0" + red.toString(16) : red.toString(16);
    var green = Math.floor((0x00ff00 & intColor) * DARK_FACTOR) >> 8;
    green = (green < 16) ? "0" + green.toString(16) : green.toString(16);
    var blue = Math.floor((0x0000ff & intColor) * DARK_FACTOR);
    blue = (blue < 16) ? "0" + blue.toString(16) : blue.toString(16);
    return "#" + red + green + blue;
}

function brighter(color) {
    var intColor = parse6DigitColor(color);
    var red = (div((0xff0000 & intColor), BRIGHT_FACTOR)) >> 16;
    if (red > 0xff)
        red = 0xff;
    red = (red < 16) ? "0" + red.toString(16) : red.toString(16);
    var green = (div((0x00ff00 & intColor), BRIGHT_FACTOR)) >> 8;
    if (green > 0xff)
        green = 0xff;
    green = (green < 16) ? "0" + green.toString(16) : green.toString(16);
    var blue = div((0x0000ff & intColor), BRIGHT_FACTOR);
    if (blue > 0xff)
        blue = 0xff;
    blue = (blue < 16) ? "0" + blue.toString(16) : blue.toString(16);
    return "#" + red + green + blue;
}

function newPos(dir, inc) {
    return (((dir > 0) ? 1 : -1) * inc);
}

function drawMovement(that, dir, spaces) {
    // beware of this and that: Edward Gory
    if (that.pressedBead === null) {
        delta = 0;
        return;
    }
    that.drawStep(dir, spaces);
    delta++;
    if (delta >= that.slices) {
        clearTimeout(timer);
        delta = 0;
        if (that.sound) {
            bumpSound.play();
        }
        //var move = new Move();
        //this.undo.push(move);
        //this.redo = new Array();
        that.drawAbacus();
        that.pressedBead = null;
    }
}

//var resumeAbacus = false;
/*if (typeof resumeAbacus !== "function") {
    saveAbacusState = function() {
        return false;
    }
    resumeAbacus = function() {
}*/

var abaci = [];

function init(abaci, number) {
 for (var i = 0; i < number; i++) {
  abaci[i] = {
initSpaceAbacus : function() {
    this.decks = 2;
    this.deck = new Array(this.decks);
    for (var level = 0; level < this.decks; level++)
        this.deck[level] = {};
    // beads have fixed height based on width, FIXME
    this.beadColor = new Array(4);
    this.beadColor[0] = new Array(4);
    this.beadColor[1] = new Array(4);
    this.beadColor[2] = new Array(4);
    this.beadColor[3] = new Array(4);
    this.railColor = new Array(3);
    this.railColor[0] = new Array(3);
    this.railColor[1] = new Array(3);
    this.railColor[2] = new Array(3);
    this.display = {};
    this.teachAString = '';
    this.teachBString = '';
    this.teachRString = '';
    this.teachSString = '';
    this.teachADigit = 0;
    this.teachBDigit = 0;
    this.teachOp = ' ';
    this.teachStep = 0;
    this.teachState = 0;
    this.teachCarry = new Array(2);
    this.teachCarry[0] = 0;
    this.teachCarry[1] = 0;
    this.teachLower = 0;
    this.teachUpper = 0;
    this.teachDPosition = 0;
},

setFormat : function(display, format) {
    this.frameColor = (this.frameColor === undefined) ?
        "#8b7e66" : this.frameColor; // tan, wheat4
    this.background = (this.background === undefined) ?
        "#aeb2c3" : this.background; // steel blue
    this.border = (this.border === undefined) ?
        "#404040" : this.border; // gray25
    this.beadColor[0][1] = (this.beadColor[0][1] === undefined) ?
        "#8b0000" : this.beadColor[0][1]; // dark red
    this.beadColor[1][1] = (this.beadColor[1][1] === undefined) ?
        "#8b7355" : this.beadColor[1][1]; // brown burlywood4
    this.beadColor[2][1] = (this.beadColor[2][1] === undefined) ?
        "#afafff" : this.beadColor[2][1]; // silver, LightSteelBlue1
    this.beadColor[3][1] = (this.beadColor[3][1] === undefined) ?
        "#7fff7f" : this.beadColor[3][1]; // green bill
    for (var beadColorIndex = 0; beadColorIndex < 4; beadColorIndex++) {
        this.beadColor[beadColorIndex][0] = brighter(this.beadColor[beadColorIndex][1]);
        this.beadColor[beadColorIndex][2] = darker(this.beadColor[beadColorIndex][1]);
        this.beadColor[beadColorIndex][3] = darker(this.beadColor[beadColorIndex][2]);
    }
    this.railColor[0][1] = (this.railColor[0][1] === undefined) ?
        "#ffd700" : this.railColor[0][1]; // gold
    this.railColor[1][1] = (this.railColor[1][1] === undefined) ?
        "#cbd5ff" : this.railColor[1][1]; // silver, LightSteelBlue1
    this.railColor[2][1] = (this.railColor[2][1] === undefined) ?
        "#a020f0" : this.railColor[2][1]; // purple
    for (var railColorIndex = 0; railColorIndex < 3; railColorIndex++) {
        this.railColor[railColorIndex][0] = brighter(this.railColor[railColorIndex][1]);
        this.railColor[railColorIndex][2] = darker(this.railColor[railColorIndex][1]);
    }
    this.rails = (this.rails === undefined) ?
        DEFAULT_RAILS : parseInt(this.rails);
    this.base = (this.base === undefined) ?
        DEFAULT_BASE : parseInt(this.base);
    this.display.base = (display.base === undefined) ?
        this.base : parseInt(display.base);
    this.decimalPosition = (this.decimalPosition === undefined) ?
        DEFAULT_DECIMAL_POSITION : parseInt(this.decimalPosition);
    this.sign = (this.sign === undefined) ?
        false : !(parseInt(this.sign) === 0);
    this.ancientRoman = (this.ancientRoman === undefined) ?
        false : !(parseInt(this.ancientRoman) === 0);
    this.modernRoman = (this.modernRoman === undefined) ?
        false : !(parseInt(this.modernRoman) === 0);
    this.latin = (this.latin === undefined) ?
        false : !(parseInt(this.latin) === 0);
    this.museum = (this.museum === undefined) ?
        "uk" : this.museum.toLowerCase(); // it|uk|fr
    this.currency = (this.currency === undefined) ?
        "" : this.currency.toLowerCase(); // us|jp|kr|ru|eu
    this.group = (this.group === undefined) ?
        false : !(parseInt(this.group) === 0);
    this.groupSize = (this.groupSize === undefined) ?
        DEFAULT_GROUP_SIZE : parseInt(this.groupSize);
    this.decimalComma = (this.decimalComma === undefined) ?
        false : !(parseInt(this.decimalComma) === 0);
    this.rightToLeftAdd = (this.rightToLeftAdd === undefined) ?
        false : !(parseInt(this.rightToLeftAdd) === 0);
    this.rightToLeftMult = (this.rightToLeftMult === undefined) ?
        false : !(parseInt(this.rightToLeftMult) === 0);
    this.anomaly = (this.anomaly === undefined) ? 0 : parseInt(this.anomaly);
    this.anomalySq = (this.anomalySq === undefined) ?
        0 : parseInt(this.anomalySq);
    this.shiftAnomaly = (this.shiftAnomaly === undefined) ?
        DEFAULT_SHIFT_ANOMALY : parseInt(this.shiftAnomaly);
    this.shiftAnomalySq = (this.shiftAnomalySq === undefined) ?
        4 : parseInt(this.shiftAnomalySq);
    this.deck[BOTTOM].factor = (this.deck[BOTTOM].factor === undefined) ?
        1 : parseInt(this.deck[BOTTOM].factor);
    this.deck[BOTTOM].pieces = (this.deck[BOTTOM].pieces === undefined) ?
        0 : parseInt(this.deck[BOTTOM].pieces);
    this.deck[BOTTOM].pieces = (this.deck[BOTTOM].pieces <= 1) ?
        0 : this.deck[BOTTOM].pieces;
    this.deck[TOP].pieces = (this.deck[TOP].pieces === undefined) ?
        0 : parseInt(this.deck[TOP].pieces);
    this.deck[TOP].pieces = (this.deck[TOP].pieces <= 1) ?
        0 : this.deck[TOP].pieces;
    this.deck[BOTTOM].piecePercents =
        (this.deck[BOTTOM].piecePercents === undefined) ?
        0 : parseInt(this.deck[BOTTOM].piecePercents);
    this.deck[BOTTOM].piecePercents =
        (this.deck[BOTTOM].piecePercents <= 1) ?
        0 : this.deck[BOTTOM].piecePercents;
    this.deck[TOP].piecePercents = (this.deck[TOP].piecePercents === undefined) ?
        0 : parseInt(this.deck[TOP].piecePercents);
    this.deck[TOP].piecePercents = (this.deck[TOP].piecePercents <= 1) ?
        0 : this.deck[TOP].piecePercents;
    this.shiftPercent = (this.shiftPercent === undefined) ?
        2 : parseInt(this.shiftPercent);
    this.subdecks = (this.subdecks === undefined) ?
        0 : parseInt(this.subdecks);
    this.subbeads = (this.subbeads === undefined) ?
        DEFAULT_SUBBEADS : parseInt(this.subbeads);
    this.subbase = (this.subbase === undefined) ?
        SUBBASE_TWELFTHS : parseInt(this.subbase);
    this.colorScheme = (this.colorScheme === undefined) ?
        0 : parseInt(this.colorScheme);
    if (format === "cn" || format === "zh" || format === "chinese") {
        // "chinese" default
        this.deck[TOP].factor = convertBaseToBottom(this.base);
        this.deck[BOTTOM].beads = this.deck[TOP].factor;
        this.deck[TOP].beads = div(this.base, this.deck[TOP].factor);
        this.deck[BOTTOM].orient = DEFAULT_BOTTOM_ORIENT;
        this.deck[TOP].orient = DEFAULT_TOP_ORIENT;
        //this.deck[TOP].pieces = 0;
        //this.deck[BOTTOM].pieces = 0;
        //this.deck[TOP].piecePercents = 0;
        //this.deck[BOTTOM].piecePercents = 0;
        this.vertical = (this.vertical === undefined) ?
            false : !(parseInt(this.vertical) === 0);
        this.slot = false;
        this.diamond = false;
        this.medieval = false;
        this.deck[TOP].spaces = (this.deck[TOP].spaces === undefined) ?
            DEFAULT_TOP_SPACES : parseInt(this.deck[TOP].spaces);
        this.deck[BOTTOM].spaces = (this.deck[BOTTOM].spaces === undefined) ?
            DEFAULT_BOTTOM_SPACES : parseInt(this.deck[BOTTOM].spaces);
        this.railIndex = 0;
        this.colorScheme = 0;
    } else if (format === "ja" || format === "jp" || format === "japanese") {
        this.deck[TOP].factor = convertBaseToBottom(this.base);
        this.deck[BOTTOM].beads = this.deck[TOP].factor - 1;
        this.deck[TOP].beads = div(this.base, this.deck[TOP].factor) - 1;
        this.deck[BOTTOM].orient = DEFAULT_BOTTOM_ORIENT;
        this.deck[TOP].orient = DEFAULT_TOP_ORIENT;
        this.vertical = (this.vertical === undefined) ?
            false : !(parseInt(this.vertical) === 0);
        this.slot = false;
        this.diamond = true;
        this.medieval = false;
        this.colorScheme = 0;
        this.railIndex = 0;
        this.deck[TOP].spaces = (this.deck[TOP].spaces === undefined) ?
            (DEFAULT_TOP_SPACES - 1) : parseInt(this.deck[TOP].spaces);
        this.deck[BOTTOM].spaces = (this.deck[BOTTOM].spaces === undefined) ?
            (DEFAULT_BOTTOM_SPACES - 1) : parseInt(this.deck[BOTTOM].spaces);
    } else if (format === "ko" || format === "kr" || format === "korean") {
        this.deck[TOP].factor = convertBaseToBottom(this.base);
        this.deck[BOTTOM].beads = this.deck[TOP].factor;
        this.deck[TOP].beads = div(this.base, this.deck[TOP].factor) - 1;
        this.deck[BOTTOM].orient = DEFAULT_BOTTOM_ORIENT;
        this.deck[TOP].orient = DEFAULT_TOP_ORIENT;
        //this.deck[TOP].pieces = 0;
        //this.deck[BOTTOM].pieces = 0;
        //this.deck[BOTTOM].piecePercents = 0;
        this.vertical = (this.vertical === undefined) ?
            false : !(parseInt(this.vertical) === 0);
        this.slot = false;
        this.diamond = true;
        this.medieval = false;
        this.colorScheme = 0;
        this.railIndex = 0;
        this.deck[TOP].spaces = (this.deck[TOP].spaces === undefined) ?
            (DEFAULT_TOP_SPACES - 1) : parseInt(this.deck[TOP].spaces);
        this.deck[BOTTOM].spaces = (this.deck[BOTTOM].spaces === undefined) ?
            (DEFAULT_BOTTOM_SPACES - 1) : parseInt(this.deck[BOTTOM].spaces);
    } else if (format === "ru" || format === "russian") {
        this.deck[TOP].factor = this.base;
        this.deck[BOTTOM].beads = this.base;
        this.deck[TOP].beads = 0;
        this.deck[BOTTOM].orient = !DEFAULT_BOTTOM_ORIENT;
        this.deck[TOP].orient = DEFAULT_TOP_ORIENT;
        //this.deck[TOP].pieces = 0;
        //this.deck[BOTTOM].pieces = 4;
        //this.deck[BOTTOM].piecePercents = 0;
        //this.deck[BOTTOM].piecePercents = 4;
        this.vertical = (this.vertical === undefined) ?
            true : !(parseInt(this.vertical) === 0);
        this.slot = false;
        this.diamond = false;
        this.medieval = false;
        this.railIndex = 1;
        this.colorScheme = COLOR_MIDDLE | COLOR_FIRST;
        this.deck[TOP].spaces = 0;
        this.deck[BOTTOM].spaces = (this.deck[BOTTOM].spaces === undefined) ?
            (DEFAULT_BOTTOM_SPACES + 3) : parseInt(this.deck[BOTTOM].spaces);
    } else if (format === "dk" || format === "danish") {
        this.deck[TOP].factor = this.base;
        this.deck[BOTTOM].beads = this.base;
        this.deck[TOP].beads = 0;
        this.deck[BOTTOM].orient = DEFAULT_BOTTOM_ORIENT;
        this.deck[TOP].orient = DEFAULT_TOP_ORIENT;
        //this.deck[TOP].pieces = 0;
        //this.deck[BOTTOM].pieces = 0;
        //this.deck[BOTTOM].piecePercents = 0;
        this.vertical = (this.vertical === undefined) ?
            true : !(parseInt(this.vertical) === 0);
        this.slot = false;
        this.diamond = false;
        this.medieval = false;
        this.railIndex = 1;
        this.colorScheme = COLOR_HALF;
        this.deck[TOP].spaces = 0;
        this.deck[BOTTOM].spaces = (this.deck[BOTTOM].spaces === undefined) ?
            (DEFAULT_BOTTOM_SPACES + 6) : parseInt(this.deck[BOTTOM].spaces);
    } else if (format === "ro" || format === "it" || format === "roman") {
        this.deck[TOP].factor = convertBaseToBottom(this.base);
        this.deck[BOTTOM].beads = this.deck[TOP].factor - 1;
        this.deck[TOP].beads = div(this.base, this.deck[TOP].factor) - 1;
        this.deck[BOTTOM].orient = DEFAULT_BOTTOM_ORIENT;
        this.deck[TOP].orient = DEFAULT_TOP_ORIENT;
        //this.deck[TOP].pieces = 2;
        //this.deck[BOTTOM].pieces = 6;
        //this.deck[BOTTOM].piecePercents = 0;
        this.vertical = (this.vertical === undefined) ?
            false : !(parseInt(this.vertical) === 0);
        this.slot = true;
        this.diamond = false;
        this.medieval = false;
        this.colorScheme = 0;
        this.railIndex = 0;
        this.deck[TOP].spaces = DEFAULT_TOP_SPACES + 1;
        this.deck[BOTTOM].spaces = DEFAULT_BOTTOM_SPACES + 1;
        this.deck[TOP].spaces = (this.deck[TOP].spaces === undefined) ?
            (DEFAULT_TOP_SPACES + 1) : parseInt(this.deck[TOP].spaces);
        this.deck[BOTTOM].spaces = (this.deck[BOTTOM].spaces === undefined) ?
            (DEFAULT_BOTTOM_SPACES + 1) : parseInt(this.deck[BOTTOM].spaces);
    } else if (format === "me" || format === "medieval") {
        this.deck[TOP].factor = convertBaseToBottom(this.base);
        this.deck[BOTTOM].beads = this.deck[TOP].factor;
        this.deck[TOP].beads = div(this.base, this.deck[TOP].factor);
        this.deck[BOTTOM].orient = DEFAULT_BOTTOM_ORIENT;
        this.deck[TOP].orient = !DEFAULT_TOP_ORIENT;
        this.vertical = (this.vertical === undefined) ?
            true : !(parseInt(this.vertical) === 0);
        this.slot = false;
        this.diamond = false;
        this.medieval = true;
        this.deck[TOP].spaces = DEFAULT_TOP_SPACES - 1;
        this.deck[BOTTOM].spaces = DEFAULT_BOTTOM_SPACES;
        this.deck[TOP].spaces = (this.deck[TOP].spaces === undefined) ?
            (DEFAULT_TOP_SPACES - 1) : parseInt(this.deck[TOP].spaces);
        this.deck[BOTTOM].spaces = (this.deck[BOTTOM].spaces === undefined) ?
            DEFAULT_BOTTOM_SPACES : parseInt(this.deck[BOTTOM].spaces);
        this.railIndex = 0;
        this.colorScheme = 0;
    } else {
        // "generic" default
        this.deck[TOP].factor = (this.deck[TOP].factor === undefined) ?
            convertBaseToBottom(this.base) :
            parseInt(this.deck[TOP].factor);
        this.deck[BOTTOM].beads = (this.deck[BOTTOM].beads === undefined) ?
            this.deck[TOP].factor : parseInt(this.deck[BOTTOM].beads);
        this.deck[TOP].beads = (this.deck[TOP].beads === undefined) ?
            div(this.base, this.deck[TOP].factor) :
            parseInt(this.deck[TOP].beads);
        this.deck[BOTTOM].orient = (this.deck[BOTTOM].orient === undefined) ?
            DEFAULT_BOTTOM_ORIENT :
            !(parseInt(this.deck[BOTTOM].orient) === 0);
        this.deck[TOP].orient = (this.deck[TOP].orient === undefined) ?
            DEFAULT_TOP_ORIENT :
            !(parseInt(this.deck[TOP].orient) === 0);
        this.vertical = (this.vertical === undefined) ?
            false : !(parseInt(this.vertical) === 0);
        this.slot = (this.slot === undefined) ?
            false : !(parseInt(this.slot) === 0);
        this.diamond = (this.diamond === undefined) ?
            false : !(parseInt(this.diamond) === 0);
        this.medieval = (this.medieval === undefined) ?
            false : !(parseInt(this.medieval) === 0);
        this.deck[TOP].spaces = (this.deck[TOP].spaces === undefined) ?
            DEFAULT_TOP_SPACES : parseInt(this.deck[TOP].spaces);
        this.deck[BOTTOM].spaces = (this.deck[BOTTOM].spaces === undefined) ?
            DEFAULT_BOTTOM_SPACES : parseInt(this.deck[BOTTOM].spaces);
        this.railIndex = 0;
    }
    this.centsSymbol = "";
    if (this.currency === "eu") {
        this.currency = "eu";
        this.currencyRails = 6;
        this.currencyOffset = 2;
        this.billOffset = 1;
        this.showValue = true;
        this.currencySymbol = "\u20ac";
        this.centsSymbol = "\u00a2";
    } else if (this.currency === "gb") {
        this.currency = "gb";
        this.currencyRails = 6;
        this.currencyOffset = 2;
        this.billOffset = 1;
        this.showValue = true;
        this.currencySymbol = "\u00a3";
        this.centsSymbol = "p";
    } else if (this.currency === "jp" || format === "ja") {
        this.currency = "jp";
        this.currencyRails = 5;
        this.currencyOffset = 0; // no cents
        this.billOffset = 3;
        this.showValue = true;
        this.currencySymbol = "\u00a5";
    } else if (this.currency === "kr" || this.currency === "ko") {
        this.currency = "kr";
        this.currencyRails = 5;
        this.currencyOffset = 0; // no cents
        this.billOffset = 3;
        this.showValue = true;
        this.currencySymbol = "\u20a9";
    } else if (this.currency === "ru") {
        this.currency = "ru";
        this.currencyRails = 6;
        this.currencyOffset = 2;
        this.billOffset = 2;
        this.showValue = true;
        this.currencySymbol = "\u20bd";
    } else {
        this.currencyRails = 9;
        this.currencyOffset = 3; // for half cents
        this.billOffset = 0;
        this.showValue = false; // show obverse
        this.currencySymbol = "$";
        this.centsSymbol = "\u00a2";
    }
    this.allCells = 0;
    for (var level = 0; level < this.decks; level++) {
        this.deck[level].cells = this.deck[level].beads +
            this.deck[level].spaces;
        this.allCells += this.deck[level].cells;
    }

    if (typeof Audio == undefined) {
        this.sound = false;
    } else {
        this.sound = (this.sound == undefined) ?
            false : !(parseInt(this.sound) === 0);
    }
    if (this.currency !== "") {
// && this.rails >= this.currencyRails
        this.setCurrency();
    }
    this.slices = 8;
    // beads are only circles, no odd sizes FIXME
    // not sure about setting a default size, FIXME?
    // default was 24
    this.beadSize = (this.beadSize == undefined) ?
        0 : parseInt((this.beadSize >> 1) << 1);
    if (this.beadSize === 0) {
        this.fullWindow = true;
    } else {
        this.fullWindow = false;
    }
    this.calculateAbacusSize();
},


calculateAbacusSize : function() {
    if (this.fullWindow) {
        if (this.vertical)
            this.frameSize = new Coord(window.innerHeight - 28, window.innerWidth - 28);
        else
            this.frameSize = new Coord(window.innerWidth - 28, window.innerHeight - 76);
        if (this.medieval)
            this.frameSize.x = ((3 * this.frameSize.x) >> 2);
        //this.beadSize = div(15 * this.frameSize.x, (16 * (this.rails + 3)));
        //this.beadSize = div(this.frameSize.y, 15);
        this.beadSize = Math.floor(Math.min(14 * this.frameSize.x / (16 * (this.rails + 3)), this.frameSize.y / 15));
        this.beadSize = (this.beadSize >> 1) << 1;
    }
    {
        this.frameThickness = (this.beadSize >> 1);
        this.beadWidth = this.beadSize;
        if (this.medieval)
            this.beadHeight = this.beadSize;
        else {
            this.beadHeight = div((this.beadSize << 1), 3.0);
            this.beadHeight = (this.beadHeight >> 1) << 1;
        }
        this.beadRadiusX = (this.beadWidth >> 1);
        this.beadRadiusY = (this.beadHeight >> 1);
        if (this.medieval)
            this.beadGapX = this.beadSize;
        else
            this.beadGapX = 3 * (this.beadHeight >> 3);
        this.middleBarThickness = this.frameThickness;
        this.middleBarY = this.deck[TOP].cells * this.beadHeight +
             this.frameThickness;
        if (this.medieval)
            this.railThickness = (this.beadSize >> 5) + 1;
        else if (this.slot)
            this.railThickness = (this.beadSize >> 3) + 2;
        else
            this.railThickness = (this.beadSize >> 4) + 1;
        this.setFrame();
    }
},

setCurrency : function() {
    this.images = new Array(2);
    for (var deck = 0; deck < 2; deck++) {
        this.images[deck] = new Array(this.currencyRails);
        for (var rail = 0; rail < this.currencyRails; rail++) {
            if ((this.deck[BOTTOM].pieces === 0) || deck !== 1 || rail !== this.currencyoffset) {
                this.images[deck][rail] = new Image();
            }
        }
    }
    var count = 0;
    // coins should be png for masking, bills should be jpg for size
    if (this.currency === "eu") {
        // https://en.wikipedia.org/wiki/Euro
        this.images[0][count].src = "eu-.01r.png";
        this.images[1][count++].src = "eu-.05r.png";
        this.images[0][count].src = "eu-.1r.png";
        this.images[1][count++].src = "eu-.5r.png";
        this.images[0][count].src = "eu-1r.png";
        // Bank notes
        this.images[1][count++].src = "eu-5o.png";
        this.images[0][count].src = "eu-10o.png";
        this.images[1][count++].src = "eu-50o.png";
        this.images[0][count].src = "eu-100o.png";
        this.images[1][count++].src = "eu-500o.png";
        this.images[0][count].src = "eu-1000o.png";
        this.images[1][count].src = "eu-5000o.png";
    } else if (this.currency === "gb") {
        // https://en.wikipedia.org/wiki/Coins_of_the_pound_sterling
        this.images[0][count].src = "gb-.01r.png";
        this.images[1][count++].src = "gb-.05r.png";
        this.images[0][count].src = "gb-.1r.png";
        this.images[1][count++].src = "gb-.5r.png";
        this.images[0][count].src = "gb-1r.png";
        // Bank notes
        this.images[1][count++].src = "gb-5o.jpg";
        this.images[0][count].src = "gb-10o.jpg";
        this.images[1][count++].src = "gb-50o.jpg";
        this.images[0][count].src = "gb-100o.jpg";
        this.images[1][count++].src = "gb-500o.png";
        this.images[0][count].src = "gb-1000o.png";
        this.images[1][count].src = "gb-5000o.png"; // does not exist
    } else if (this.currency === "jp") {
        // https://en.wikipedia.org/wiki/Japanese_yen
        // had to do cropping, looks like coins are not as round as should be
        // TODO should allow obverse
        this.images[0][count].src = "jp-1r.png";
        this.images[1][count++].src = "jp-5r.png"; // hole
        this.images[0][count].src = "jp-10r.png";
        this.images[1][count++].src = "jp-50r.png"; // hole
        this.images[0][count].src = "jp-100r.png";
        this.images[1][count++].src = "jp-500r.png";
        // Bank notes
        this.images[0][count].src = "jp-1000o.jpg";
        this.images[1][count++].src = "jp-5000o.jpg";
        this.images[0][count].src = "jp-10000o.jpg";
        // Added commemorative coin to round out.
        this.images[1][count].src = "jp-50000o.png";
    } else if (this.currency === "kr") {
        // https://en.wikipedia.org/wiki/South_Korean_won
        // TODO should allow obverse
        this.images[0][count].src = "kr-1r.png";
        this.images[1][count++].src = "kr-5r.png";
        this.images[0][count].src = "kr-10r.png";
        this.images[1][count++].src = "kr-50r.png";
        this.images[0][count].src = "kr-100r.png";
        this.images[1][count++].src = "kr-500r.png";
        // Bank notes
        this.images[0][count].src = "kr-1000o.jpg";
        this.images[1][count++].src = "kr-5000o.jpg";
        this.images[0][count].src = "kr-10000o.jpg";
        this.images[1][count].src = "kr-50000o.jpg";
    } else if (this.currency === "ru") {
        // https://en.wikipedia.org/wiki/Russian_ruble
        this.images[0][count].src = "ru-.01r.png";
        this.images[1][count++].src = "ru-.05r.png";
        this.images[0][count].src = "ru-.1r.png";
        this.images[1][count++].src = "ru-.5r.png";
        this.images[0][count].src = "ru-1r.png";
        this.images[1][count++].src = "ru-5r.png";
        this.images[0][count].src = "ru-10r.png";
        // Bank notes
        this.images[1][count++].src = "ru-50o.jpg";
        this.images[0][count].src = "ru-100o.jpg";
        this.images[1][count++].src = "ru-500o.jpg";
        this.images[0][count].src = "ru-1000o.jpg";
        this.images[1][count].src = "ru-5000o.jpg";
    } else {
        // https://en.wikipedia.org/wiki/United_States_dollar
        // File names were changed, but I guess I did not have to.
        // $20 is very common but does not fit in abacus.
        if (this.showValue) {
            // Kind of useless as US coins do not show value with digits
            this.images[0][count].src = "us-.001r.png"; // does not exist
            this.images[1][count++].src = "us-.005r.png";
            this.images[0][count].src = "us-.01r.png";
            this.images[1][count++].src = "us-.05r.png";
            this.images[0][count].src = "us-.1r.png";
            this.images[1][count++].src = "us-.5r.png";
        } else {
            this.images[0][count].src = "us-.001o.png"; // does not exist
            this.images[1][count++].src = "us-.005o.png";
            this.images[0][count].src = "us-.01o.png";
            this.images[1][count++].src = "us-.05o.png";
            this.images[0][count].src = "us-.1o.png";
            this.images[1][count++].src = "us-.5o.png";
        }
        if (this.deck[BOTTOM].pieces !== 0)
            this.images[0][count++].src = "us-.25o.png"; // value on obverse
        // Bank notes
        this.images[0][count].src = "us-1o.jpg";
        this.images[1][count++].src = "us-5o.jpg";
        this.images[0][count].src = "us-10o.jpg";
        this.images[1][count++].src = "us-50o.jpg";
        this.images[0][count].src = "us-100o.jpg";
        // no longer use beyond 100
        this.images[1][count++].src = "us-500o.jpg";
        this.images[0][count].src = "us-1000o.jpg";
        this.images[1][count++].src = "us-5000o.jpg";
        this.images[0][count].src = "us-10000o.jpg";
        this.images[1][count].src = "us-50000o.jpg"; // does not exist
    }
    // That is it so far, but want to add more.
},

setFormatFromElement : function(display, element) {
    var article = document.getElementById(element);
    if (article !== null && article.dataset) {
        this.format = article.dataset.format;
        if (element.indexOf("0") !== -1)  { // contains
            this.rails = (document.getElementById("auxiliary0_rails_number") === null) ?
                article.dataset.rails :
                document.getElementById("auxiliary0_rails_number").value;
            //this.auxiliary0Rails
        } else if (element.indexOf("1") !== -1)  {
            this.rails = (document.getElementById("auxiliary1_rails_number") === null) ?
                article.dataset.rails :
                document.getElementById("auxiliary1_rails_number").value;
            //this.auxiliary1Rails
        } else {
            this.rails = (document.getElementById("abacus_rails_number") === null) ?
                article.dataset.rails :
                document.getElementById("abacus_rails_number").value;
        }
        this.base = article.dataset.base;
        display.base = article.dataset.displayBase;
        this.decimalPosition = article.dataset.decimalPosition;

        this.deck[TOP].factor = article.dataset.topFactor;
        this.deck[BOTTOM].beads = article.dataset.bottomBeads;
        this.deck[TOP].beads = article.dataset.topBeads;
        this.deck[BOTTOM].spaces = article.dataset.bottomSpaces;
        this.deck[TOP].spaces = article.dataset.topSpaces;
        this.deck[BOTTOM].orient = article.dataset.bottomOrient;
        this.deck[TOP].orient = article.dataset.topOrient;
        this.deck[BOTTOM].pieces = article.dataset.bottomPieces;
        this.deck[TOP].pieces = article.dataset.topPieces;
        this.deck[BOTTOM].piecePercents = article.dataset.bottomPiecePercents;
        this.deck[TOP].piecePercents = article.dataset.topPiecePercents;
        this.subdecks = article.dataset.subdecks;
        this.subbeads = article.dataset.subbeads;
        this.subbase = article.dataset.subbase;
        this.sign = article.dataset.sign;
        this.anomaly = article.dataset.anomaly;
        this.anomalySq = article.dataset.anomalySq;
        this.shiftAnomaly = article.dataset.shiftAnomaly;
        this.shiftAnomalySq = article.dataset.shiftAnomalySq;
        this.diamond = article.dataset.diamond;
        this.vertical = article.dataset.vertical;
        this.slot = article.dataset.slot;
        this.medieval = article.dataset.medieval;
        this.romanNumerals = article.dataset.romanNumerals;
        this.ancientRoman = article.dataset.ancientRoman;
        this.modernRoman = article.dataset.modernRoman;
        this.latin = article.dataset.latin;
        this.museum = article.dataset.museum;
        this.currency = article.dataset.currency;
        this.group = article.dataset.group;
        this.groupSize = article.dataset.groupSize;
        this.decimalComma = article.dataset.decimalComma;
        this.rightToLeftAdd = article.dataset.rightToLeftAdd;
        this.rightToLeftMult = article.dataset.rightToLeftMult;
        this.sound = article.dataset.sound;
        this.beadSize = article.dataset.beadSize;
        this.beadColor[0][1] = article.dataset.beadColorPrimary;
        this.beadColor[1][1] = article.dataset.beadColorSecondary;
        this.railColor[0][1] = article.dataset.railColorPrimary;
        this.railColor[1][1] = article.dataset.railColorSecondary;
        this.frameColor = article.dataset.frameColor;
        this.background = article.dataset.background;
        this.border = article.dataset.border;
        this.colorScheme = article.dataset.colorScheme;
        this.railOffset = article.dataset.railOffset;
    }
    this.format = (this.format === undefined) ?
        "generic" : this.format.toLowerCase();
    this.setFormat(display, this.format);
    this.updateWidgets(display);
},

setFrame : function() {
    this.frameSize = new Coord(this.rails * (this.beadSize + this.beadGapX)
        + this.beadGapX + 2 * this.frameThickness,
        this.allCells * this.beadHeight
        + 2 * this.frameThickness + this.middleBarThickness);
},

getPieces : function(deck) {
    if (deck === 0) {
        if (this.deck[BOTTOM].beads > (this.base >> 1))
            return this.deck[BOTTOM].pieces - this.base
                + this.deck[BOTTOM].beads;
        else
            return this.deck[BOTTOM].pieces - this.deck[TOP].factor
                + this.deck[BOTTOM].beads;
    }
    if (this.deck[TOP].beads > 0)
        return this.deck[TOP].pieces
            - div(this.base, this.deck[TOP].factor)
            + this.deck[TOP].beads;
    return 0;
},

getPieceSpaces : function(deck) {
    return this.deck[deck].cells - this.getPieces(deck);
},

getPieceFactor : function(deck) {
    return (deck === 0) ? 1 : this.deck[BOTTOM].pieces;
},

/*getPieceBase : function(deck) {
    return (this.deck[TOP].pieces > 0) ? this.deck[TOP].pieces
        * this.deck[BOTTOM].pieces : this.deck[BOTTOM].pieces;
},*/

getPiecePercents : function(deck) {
    if (deck === 0) {
        if (this.deck[BOTTOM].beads > (this.base >> 1))
            return this.deck[BOTTOM].piecePercents - this.base
                + this.deck[BOTTOM].beads;
        else
            return this.deck[BOTTOM].piecePercents - this.deck[TOP].factor
                + this.deck[BOTTOM].beads;
    }
    if (this.deck[TOP].beads > 0)
        return this.deck[TOP].piecePercents
            - div(this.base, this.deck[TOP].factor)
            + this.deck[TOP].beads;
    return 0;
},

getPiecePercentSpaces : function(deck) {
    return this.deck[deck].cells - this.getPiecePercents(deck);
},

getPiecePercentFactor : function(deck) {
    return (deck === 0) ? 1 : this.deck[BOTTOM].piecePercents;
},

/*getPiecePercentBase : function(deck) {
    return (this.deck[TOP].piecePercents > 0) ? this.deck[TOP].piecePercents
        * this.deck[BOTTOM].piecePercents : this.deck[BOTTOM].piecePercents;
}*/

getSubdeckBeads : function(subdeck) {
    var beads = div(this.subbeads, this.subdecks);

    if (subdeck === 0)
        beads += this.subbeads - this.subdecks * beads;
    return beads;
},

getSubdeckCells : function(subdeck) {
    return this.getSubdeckBeads(subdeck) + SUBDECK_SPACES;
},

getNumberSubbeadsOffset : function(local) {
    var nOffset = 0;
    if (local < 0)
        return this.subbeads + this.subdecks * SUBDECK_SPACES;
    for (var subdeck = 0; subdeck < this.subdecks - 1 - local; subdeck++) {
        nOffset += this.getSubdeckBeads(this.subdecks - 1 - subdeck)
            + SUBDECK_SPACES;
    }
    return nOffset;
},

getSubpositionSubdeck : function(position) {
   var subdeck = this.getSubdeckFromPosition(position);
   return position - this.getNumberSubbeadsOffset(subdeck);
},

getSubdeckFromPosition : function(position) {
    var subdeck;
    for (subdeck = this.subdecks - 1; subdeck >= 0; subdeck--) {
        if (position < this.getNumberSubbeadsOffset(subdeck - 1)) {
            break;
        }
    }
    return subdeck;
},

// These also have different writing on subdeck portion
getSubdeckSlotsSeparate : function(museum) {
    return (museum === "uk"); // museum !== "it" && museum !== "fr"
},

checkPiece : function() {
    return (this.rails > 1
        && this.deck[BOTTOM].pieces !== 0 && this.getPieceSpaces(BOTTOM) > 0
        && (this.deck[TOP].beads === 0 || this.getPieceSpaces(TOP) > 0));
},

checkPiecePercent : function() {
    return (this.rails > 1 + ((this.checkPiece()) ? 1 : 0) + this.shiftPercent
        && this.decimalPosition >= this.shiftPercent
        && this.deck[BOTTOM].piecePercents !== 0
        && this.getPiecePercentSpaces(BOTTOM) > 0
        && (this.deck[TOP].beads === 0 || this.getPiecePercentSpaces(TOP) > 0));
},

checkSubdeck : function() {
    return (this.rails >= 3 + ((this.checkPiece()) ? 1 : 0)
        + ((this.checkPiecePercent()) ? this.shiftPercent : 0)
        && this.slot && this.subdecks !== 0 && !this.medieval
        && this.deck[BOTTOM].cells >= this.subbeads
        + this.subdecks * SUBDECK_SPACES);
},

checkSign : function() {
    return (this.rails - this.decimalPosition
        - ((this.checkPiece()) ? 1 : 0)
        - ((this.checkPiecePercent()) ? 1 : 0)
        - ((this.checkSubdeck()) ? 2 : 0) > 1 && this.sign);
},

digit : function(display, number, place) {
    if (number === "0")
        return "";
    var roman = "IVXLCDMvxlcdm";
    /*var combiningMacron = "&#772;";*/
    var oldRoman = ["I", "V", "X", "L", "(", "I)", "(I)",
        "I))", "((I))", "I)))", "(((I)))", "I))))", "|x|"];

    var len = roman.length - 1;
    if (place * 2 > len)
        return "-";
    var i = (this.ancientRoman) ? oldRoman[place * 2] :
        roman.charAt(place * 2);
    var temp = "";
    var d;
    for (d = 1; d <= (display.base >> 2) + 1; d++) {
        temp = temp + i;
        if (number === d)
            return temp;
    }
    if (place * 2 + 1 > len)
        return "-";
    var v = (this.ancientRoman) ? oldRoman[place * 2 + 1] :
        roman.charAt(place * 2 + 1);
    temp = v;
    for (d = (display.base >> 2) + 2;
            d <= (display.base >> 1) - 1; d++) {
        temp = i + temp;
        if (number === d)
            return temp;
    }
    temp = v;
    for (d = (display.base >> 1);
            d <= (display.base >> 1) + (display.base >> 2) + 1; d++) {
        if (number === d)
            return temp;
        temp = temp + i;
    }
    //if (place * 2 + 2 > len)
    //    return "-";
    var x = (this.ancientRoman) ? oldRoman[place * 2 + 2] :
        roman.charAt(place * 2 + 2);
    temp = x;
    for (d = (display.base >> 1) + (display.base >> 2) + 2;
            d <= display.base - 1; d++) {
        temp = i + temp;
        if (number === d)
            return temp;
    }
    return "";
},

setRomanNumeral : function(display, value, pieceValue, subdeckValue) {
    var val = Math.floor(value);

    if (val < 1 && pieceValue === 0 && subdeckValue === 0)
        return "";
    var valString = val.toString(display.base);
    var len = valString.length;
    var roman = "";
    for (var i = 0; i < len; i++) {
        var letter = this.digit(display, parseInt(valString.charAt(len - 1 - i),
            display.base), i);
        if (letter === "-")
            return ""; // Roman Numeral Overflow
        roman = letter + roman;
    }

    var pieces = this.deck[BOTTOM].pieces;
    if (this.deck[TOP].pieces !== 0)
       pieces *= this.deck[TOP].pieces;
    if (pieces > 0 && ROMANFRACTIONBASE % pieces === 0) {
        if (pieces !== ROMANFRACTIONBASE)
            subdeckValue = 0; // words not scalable
        if (this.latin && // position?
                (pieceValue !== 0 || subdeckValue !== 0))
            roman += " ";
        roman += romanFraction(pieceValue, pieces,
            subdeckValue, this.subbase, this.latin);
    }
    if (roman !== "" && display.value > 0.0)
        return "  [" + roman + "]";
    return "";
},

setArabicNumeral : function(display, bead, vel) {
    var digit = 1;
    display.value = 0;
    var subdeck;
    if (vel !== 0) {
        if (bead.rail === this.decimalPosition + 1
                + ((this.checkPiecePercent()) ? 1 : 0) && this.checkSubdeck()) {
            if (bead.deck === 0) {
               subdeck = this.getSubdeckFromPosition(bead.cell);
               this.subbeadPosition[subdeck] =
                   this.subbeadPosition[subdeck] - vel;
            }
        } else {
            this.beadPosition[bead.deck][bead.rail] =
                this.beadPosition[bead.deck][bead.rail] - vel;
        }
    }
    var unitPosition = this.decimalPosition
        + ((this.checkPiece()) ? 1 : 0)
        + ((this.checkPiecePercent()) ? 1 : 0)
        + ((this.checkSubdeck()) ? 2 : 0);
    var rail, deck, beads, factor;
    for (rail = 0; rail < this.rails; rail++) {
        for (deck = 0; deck < this.decks; deck++) {
            beads = this.deck[deck].beads;
            factor = this.deck[deck].factor;
            if ((rail !== unitPosition - 1 || !this.checkPiece()) &&
                    (rail !== unitPosition - (this.checkPiece() ? 1 : 0)
                    - (this.checkSubdeck() ? 2 : 0)
                    - 1 - this.shiftPercent || !this.checkPiecePercent()) &&
                    (rail !== unitPosition - (this.checkPiece() ? 1 : 0)
                    - 1 || !this.checkSubdeck()) &&
                    (rail !== unitPosition - (this.checkPiece() ? 1 : 0)
                    - 2 || !this.checkSubdeck()) &&
                    (rail !== this.rails - 1 || !this.checkSign())) {
                if (this.deck[deck].orient) {
                    display.value += digit
                        * (beads - this.beadPosition[deck][rail]) * factor;
                } else {
                    display.value += digit
                        * this.beadPosition[deck][rail] * factor;
                }
            }
        }
        if ((rail !== unitPosition - 1 || !this.checkPiece()) &&
                (rail !== unitPosition - (this.checkPiece() ? 1 : 0)
                - (this.checkSubdeck() ? 2 : 0)
                - 1 - this.shiftPercent || !this.checkPiecePercent()) &&
                (rail !== unitPosition - (this.checkPiece() ? 1 : 0)
                - 1 || !this.checkSubdeck()) &&
                (rail !== unitPosition - (this.checkPiece() ? 1 : 0)
                - 2 || !this.checkSubdeck()) &&
                (rail !== this.rails - 1 || !this.checkSign())) {
            if (rail - unitPosition + 1 === this.shiftAnomaly
                    && this.anomaly !== 0) {
                digit *= (this.base - this.anomaly);
            } else if (rail - unitPosition + 1 === this.shiftAnomalySq
                    && this.anomalySq !== 0) {
                digit *= (this.base - this.anomalySq);
            } else {
                digit *= this.base;
            }
        }
    }
    for (var i = 0; i < this.decimalPosition; i++) {
        display.value = display.value / this.base; // not DIV
    }
    if (this.checkSign()) {
        deck = 0;
        rail = this.rails - 1;
        if (this.deck[deck].orient) {
            if (1 - this.beadPosition[deck][rail] > 0)
                display.value = -display.value;
        } else {
            if (this.beadPosition[deck][rail] > 0)
                display.value = -display.value;
        }
    }
    var pieceValue = 0;
    var pieceBase;
    if (this.checkPiece()) {
        pieceBase = (this.deck[TOP].pieces > 0) ?
            this.deck[TOP].pieces * this.deck[BOTTOM].pieces :
            this.deck[BOTTOM].pieces;
        for (deck = 0; deck < this.decks; deck++) {
            var pieces = this.getPieces(deck);
            if (pieces > 0) {
                rail = this.decimalPosition
                    + ((this.checkPiecePercent()) ? 1 : 0)
                    + ((this.checkSubdeck()) ? 2 : 0);
                factor = this.getPieceFactor(deck);
                if (this.deck[deck].orient) {
                    pieceValue +=
                        (pieces - this.beadPosition[deck][rail]) * factor;
                } else {
                    pieceValue += this.beadPosition[deck][rail] * factor;
                }
            }
        }
        display.value += pieceValue / pieceBase; // not DIV
    }
    var piecePercentValue = 0;
    if (this.checkPiecePercent()) {
        var piecePercentBase = (this.deck[TOP].piecePercents > 0) ?
            this.deck[TOP].piecePercents *
            this.deck[BOTTOM].piecePercents :
            this.deck[BOTTOM].piecePercents;
        for (deck = 0; deck < this.decks; deck++) {
            var piecePercents = this.getPiecePercents(deck);
            if (piecePercents > 0) {
                rail = this.decimalPosition - this.shiftPercent;
                factor = this.getPiecePercentFactor(deck);
                if (this.deck[deck].orient) {
                    piecePercentValue += (piecePercents -
                        this.beadPosition[deck][rail]) * factor;
                } else {
                    piecePercentValue +=
                        this.beadPosition[deck][rail] * factor;
                }
            }
        }
        display.value += piecePercentValue /
            (piecePercentBase *
            Math.pow(this.base, this.shiftPercent)); // not DIV
    }
    var subdeckValue = 0;
    if (this.checkSubdeck()) {
        pieceBase = 1;
        if (this.checkPiece()) {
            pieceBase = (this.deck[TOP].pieces > 0) ?
                this.deck[TOP].pieces * this.deck[BOTTOM].pieces :
                    this.deck[BOTTOM].pieces;
        }
        for (subdeck = 0; subdeck < this.subdecks; subdeck++) {
            var subfactor = this.convertRomanFactor(subdeck);
            var subbeads = this.getSubdeckBeads(subdeck) + 1;

            if (this.deck[BOTTOM].orient) {
                subdeckValue +=
                    (subbeads - this.subbeadPosition[subdeck]) * subfactor;
            } else {
                subdeckValue += this.subbeadPosition[subdeck] * subfactor;
            }
        }
        display.value += subdeckValue / (this.subbase * pieceBase); // not DIV
    }
    var valueString = "";
    // Fixed to not get exponential notation, need to trim 0s
    unitPosition = this.decimalPosition;
    if (this.checkPiece())
        unitPosition = Math.max(unitPosition, 3);
    if (this.checkPiecePercent())
        unitPosition = Math.max(unitPosition, 3 + this.shiftPercent);
    if (this.checkSubdeck())
        unitPosition = Math.max(unitPosition, (this.checkPiece()) ? 5 : 3);
    if (display.base === 10) // get rid of exponential notation
       valueString = trimmer(display.value.toFixed(unitPosition));
    else
       valueString = trimmer(fixed(display.value.toString(display.base).toUpperCase(),
           unitPosition));
    if (this.romanNumerals) {
       valueString += this.setRomanNumeral(display, display.value,
           pieceValue, subdeckValue);
    }
    this.setSpan(valueString);
    //saveAbacusState();
},

/* This is setup for Roman abacus of 3 subdecks
 * deck === 0 => 1/12 * pieceFactor
 * deck === 1 => 1/4 * pieceFactor
 * deck === 2 => 1/2 * pieceFactor
 * For other subdecks its more whimsical. */
convertRomanFactor : function(subdeck) {
   var pieces = this.deck[BOTTOM].pieces;

   if (this.deck[TOP].pieces !== 0)
       pieces *= this.deck[TOP].pieces;
   if (pieces === 0) // default if no pieces
       pieces = SUBBASE_TWELFTHS;
   if (this.subbase === SUBBASE_EIGHTHS) {
       if (subdeck <= 1)
           return 1;
       return subdeck * div(pieces, (this.subdecks + 3));
   }
   if (subdeck === 0)
       return 1;
   return subdeck * div(pieces, (this.subdecks + 1));
},

// Pointer

rotateInput : function(pointerInput) {
    return new Coord(pointerInput.y, this.frameSize.y - 1 - pointerInput.x);
},

getPosition : function(pointer) {
    var deck;
    pointer.x -= this.abacusCanvasElement.offsetLeft;
    pointer.y -= this.abacusCanvasElement.offsetTop;
    if (this.vertical)
        pointer = this.rotateInput(pointer);
    if (pointer.x < this.frameThickness ||
            pointer.y < this.frameThickness ||
            pointer.x >= this.frameSize.x - this.frameThickness ||
            pointer.y >= this.frameSize.y - this.frameThickness) {
       return null;
    }
    pointer.x -= (this.frameThickness + (this.beadGapX >> 1))
        + ((this.medieval) ? this.beadWidth : 0);
    pointer.x = Math.min(pointer.x, (this.rails - 1)
        * (this.beadWidth + this.beadGapX))
        + ((this.medieval) ? this.beadWidth : 0);
    pointer.x = Math.max(0, pointer.x);
    if (pointer.y > this.middleBarY || this.deck[TOP].beads === 0) {
        if (pointer.y < this.middleBarY + this.middleBarThickness) {
            return new Bead(this.decks, this.rails - 1
                - div(pointer.x,
                (this.beadWidth + this.beadGapX)), -1, -1);
        }
        deck = 0; // BOTTOM
        pointer.y = pointer.y - this.middleBarY - this.middleBarThickness;
        pointer.y = Math.min(pointer.y, (this.deck[BOTTOM].cells - 1)
            * this.beadHeight);
    } else {
        deck = 1; // TOP
        pointer.y -= this.frameThickness;
        pointer.y = Math.min(pointer.y, (this.deck[TOP].cells - 1)
            * this.beadHeight);
    }
    pointer.y = Math.max(0, pointer.y);
    if (this.medieval) {
        return new Bead(1 - (div((2 * pointer.x),
            (this.beadWidth + this.beadGapX))) % 2,
            this.rails - 1 - div(pointer.x,
            (this.beadWidth + this.beadGapX)),
            ((deck === 0) ? 1 : -1), -1);
    } else {
        return new Bead(deck,
            this.rails - 1 - div(pointer.x,
            (this.beadWidth + this.beadGapX)),
            div(pointer.y, this.beadHeight), -1);
    }
},

getCursorPosition : function(event) {
    /* returns Bead with .deck, .rail, .cell, .index properties */
    var pointer;

    if (event.pageX !== undefined && event.pageY !== undefined) {
        pointer = new Coord(event.pageX, event.pageY);
    } else {
        pointer = new Coord(event.clientX + document.body.scrollLeft
            + document.documentElement.scrollLeft,
            event.clientY + document.body.scrollTop
            + document.documentElement.scrollTop);
    }
    return this.getPosition(pointer);
},

getTouchPosition : function(event, side) {
    /* returns Bead with .deck, .rail, .cell, .index properties */
    var pointer;
    var touches = event.changedTouches;
    if (side !== 0) {
        side = touches.length - 1;
    }
    pointer = new Coord(touches[side].pageX, touches[side].pageY);
    return this.getPosition(pointer);
},

drawStep : function(dir, spaces) {
    var deckPosition = (this.pressedBead.deck === 0) ? 1 : 0;
    var rail = this.pressedBead.rail;
    var cell = this.pressedBead.cell;
    var absDir = (dir < 0) ? -dir : dir;
    var direction = (dir < 0) ? -1 : 1;
    var beads = absDir;
    var start = new Coord(((this.rails - 1 - rail)
        * (this.beadWidth + this.beadGapX)) - (this.beadWidth >> 1)
        + this.beadRadiusX + this.frameThickness + this.beadGapX - 1,
        (deckPosition * this.middleBarY) + (cell * this.beadHeight)
        + this.frameThickness + newPos(dir, delta *
        div((this.beadHeight * spaces), this.slices)));
    var eraseStart, eraseSize;
    var bead;
    eraseSize = new Coord(this.beadWidth + 1, absDir * this.beadHeight);
    if (this.vertical) {
        if (dir < -1) {
            eraseStart = new Coord(start.x, start.y + this.beadHeight);
        } else {
            eraseStart = new Coord(start.x,
                start.y + absDir * this.beadHeight);
        }
    } else {
        if (dir < -1) {
            eraseStart = new Coord(start.x,
                start.y - (absDir - 1) * this.beadHeight);
        } else {
            eraseStart = new Coord(start.x, start.y);
        }
    }
    this.eraseBead(eraseStart, eraseSize);
    for (bead = 0; bead < spaces; bead++) {
        var curSpace = new Bead(this.pressedBead.deck, this.pressedBead.rail,
            this.pressedBead.cell + direction * bead, this.pressedBead.index);
        this.drawRail(curSpace, false);
    }
    for (bead = 0; bead < beads; bead++) {
        var curBead = new Bead(this.pressedBead.deck, this.pressedBead.rail,
            this.pressedBead.cell, this.pressedBead.index + direction * bead);
        this.drawBeadMove(curBead, false, false,
            bead * direction * this.beadHeight + direction * (delta + 1)
            * div((this.beadHeight * spaces), this.slices));
    }
},

findSpaces : function(bead) {
    if (bead.rail === this.rails - 1 && this.checkSign()) {
        if (bead.deck === 1)
            return 0;
        return this.deck[BOTTOM].cells - 1;
    } else if (bead.rail === this.decimalPosition
            + ((this.checkPiecePercent()) ? 1 : 0)
            + ((this.checkSubdeck()) ? 2 : 0) && this.checkPiece()) {
        return this.getPieceSpaces(bead.deck);
    } else if (bead.rail === this.decimalPosition - this.shiftPercent
            && this.checkPiecePercent()) {
        return this.getPiecePercentSpaces(bead.deck);
    } else if (bead.rail === this.decimalPosition
            + ((this.checkPiecePercent()) ? 1 : 0) && this.checkSubdeck()) {
        return 0;
    } else if (bead.rail === this.decimalPosition + 1
            + ((this.checkPiecePercent()) ? 1 : 0) && this.checkSubdeck()) {
        if (bead.deck === 0) {
            return SUBDECK_SPACES;
        }
        return 0;
    }
    return this.deck[bead.deck].spaces;
},

findBeadsToMove : function(bead) {
    var position = this.beadPosition[bead.deck][bead.rail];
    var spaces = this.findSpaces(bead);
    var up, down;
    if (spaces === 0)
        return 0;
    if (bead.rail === this.decimalPosition + 1
            + ((this.checkPiecePercent()) ? 1 : 0) && this.checkSubdeck()) {
        var subdeck = this.getSubdeckFromPosition(bead.cell);
        var subcell = this.getSubpositionSubdeck(bead.cell);
        position = this.subbeadPosition[subdeck];
        up = subcell - position - spaces + 1;
        down = position - subcell;
        if (subcell > position) {
            bead.index = subcell - spaces;
        } else {
            bead.index = subcell;
        }
//alert("bead " + subdeck + " " + subcell + " " + position + " " + up + " " + down);
        if (up > 0 && down > 0) {
            return 0; // should not happen
        } else if (up > 0) {
            return -up;
        } else if (down > 0) {
            return down;
        }
        return 0;
    }
//alert("bead " + bead.deck + " " + bead.rail + " " + bead.cell + " " + spaces);
    up = bead.cell - position - spaces + 1;
    down = position - bead.cell;
    if (bead.cell > position) {
        bead.index = bead.cell - spaces;
    } else {
        bead.index = bead.cell;
    }
    if (up > 0 && down > 0) {
        return 0; // should not happen
    } else if (up > 0) {
        return -up;
    } else if (down > 0) {
        return down;
    }
    return 0;
},

placeCounter : function(bead, record) {
    var beads = this.deck[bead.deck].beads;
    if (bead.rail === this.decimalPosition
            + ((this.checkPiecePercent()) ? 1 : 0) && this.checkPiece()) {
        beads = this.getPieces(bead.deck);
        if (bead.deck === 1 && this.deck[TOP].pieces === 0)
            return;
    } else if (bead.rail === this.decimalPosition - this.shiftPercent
            && this.checkPiecePercent()) {
        beads = (bead.deck === 0) ? 1 : 0;
    }
    var potential = this.beadPosition[bead.deck][bead.rail] + bead.cell;
    if (potential <= beads && potential >= 0) {
        this.beadPosition[bead.deck][bead.rail] = potential;
        if (this.sound)
            bumpSound.play();
        if (record) {
            var recordMove = new Move();
            recordMove.auxiliary = 0;
            recordMove.deck = bead.deck;
            recordMove.rail = bead.rail;
            recordMove.number = bead.cell;
            this.undo.push(recordMove);
            this.redo = new Array();
        }
    }
    this.setArabicNumeral(this.display, bead, 0);
},

trimForAbacus : function(string) {
    // fix for legal numbers
    var dots = 0;
    var newString = "";
    var i;
    for (i = 0; i < string.length; i++) {
        var charCode = string.charAt(i).charCodeAt();
        if (charCode >= '0'.charCodeAt() &&
                charCode <= '9'.charCodeAt() &&
                charCode < '0'.charCodeAt() + this.display.base)
            newString += string.charAt(i);
        else if (charCode >= 'a'.charCodeAt() &&
                charCode <= 'z'.charCodeAt() &&
                charCode < 'a'.charCodeAt() + this.display.base - 10)
            //newString += string.charAt(i);
            newString += string.charAt(i).toUpperCase();
        else if (charCode >= 'A'.charCodeAt() &&
                charCode <= 'Z'.charCodeAt() &&
                charCode < 'A'.charCodeAt() + this.display.base - 10)
            //newString += string.charAt(i).toLowerCase();
            newString += string.charAt(i);
        else if (string.charAt(i) === '.' && dots === 0) {
            dots++;
            newString += string.charAt(i);
        }
    }
    string = newString;

    // fix for empty
    if (string === "") {
        string = "0";
    }
    // fix for leading "."
    if (string.charAt(0) === ".") {
        string = "0" + string;
    }
    // fix to fit in abacus itself, on left and right
    var parts = string.split(".", 2);
    this.beadPosition = new Array(2);
    var limit = this.rails - this.decimalPosition
        - ((this.checkPiece()) ? 1 : 0)
        - ((this.checkPiecePercent()) ? 1 : 0)
        - ((this.checkSubdeck()) ? 2 : 0);
    var length = parts[0].length;
    if (length > limit) {
        parts[0] = parts[0].substring(length - limit, length);
    }
    if (parts.length < 2) {
        string = parts[0];
    } else {
        limit = this.decimalPosition;
        length = parts[1].length;
        if (length > limit) {
            parts[1] = parts[1].substring(0, limit);
        }
        string = parts[0] + "." + parts[1];
    }
    // fix for leading "0"'s
    for (i = 0; i < string.length; i++) {
        if (string.charAt(i) === '0' && i !== string.length - 1)
            continue;
        if ((string.charAt(i) !== '.' && i > 0) || i > 1) {
            string = string.substring(i, string.length);
        }
        break;
    }
    // fix for trailing "0"'s
    if (string.indexOf(".") !== -1) {
        for (i = string.length - 1; i >= 0; i--) {
            if (string.charAt(i) === '0')
                continue;
            if (i < string.length - 1) {
                string = string.substring(0, i + 1);
            }
            break;
        }
    }
    // fix for trailing "."
    if (string.charAt(string.length - 1) === ".") {
        string = string.substring(0, string.length - 1);
    }
    return string;
},

letterToDigit : function(letter) {
    var charCode = letter.charCodeAt();
    if (charCode >= '0'.charCodeAt() && charCode <= '9'.charCodeAt()) {
         return charCode - '0'.charCodeAt();
    }
    if (charCode >= 'a'.charCodeAt() && charCode <= 'z'.charCodeAt()) {
        return charCode - 'a'.charCodeAt() + 10;
    }
    if (charCode >= 'A'.charCodeAt() && charCode <= 'Z'.charCodeAt()) {
        return charCode - 'A'.charCodeAt() + 10;
    }
    return 0;
},

setCounter : function(string) {
    if (this.base !== this.display.base) {
        alert("Currently base (" + this.base + ") must equal the display base ("
            + this.display.base + ") for beads to be updated.");
        return;
    }
    if (this.anomaly !== 0) {
        alert("Currently anomalies are not handled yet.");
        return;
    }
    var value = 0;
    var op = "+";
    var nextOp = "";
    while ((nextOp = this.nextOperation(string)) !== "") {
        var parts = string.split(nextOp, 2);
        value = this.show(parts[0], value, op);
        // parts[1] is truncated in JavaScript but not if Java
        string = string.substring(string.indexOf(nextOp) + 1);
        op = nextOp;
    }
    this.show(string, value, op);
},

nextOperation : function(string) {
    var indexPlus = string.indexOf("+");
    var indexMinus = string.indexOf("-");
    var indexMult = string.indexOf("*");
    var indexDivide = string.indexOf("/");
    if (indexPlus === -1 && indexMinus === -1 &&
            indexMult === -1 && indexDivide === -1) {
        return "";
    }
    var currentOp = "+";
    var indexOp = 0;

    if (indexPlus >= 0) {
        indexOp = indexPlus;
    }
    if (indexMinus >= 0) {
        currentOp = "-";
        indexOp = indexMinus;
    }
    if (indexMult >= 0) {
        currentOp = "*";
        indexOp = indexMult;
    }
    if (indexDivide >= 0) {
        currentOp = "/";
        indexOp = indexDivide;
    }
    if (indexMult >= 0 && indexMult < indexOp) {
        currentOp = "*";
        indexOp = indexMult;
    }
    if (indexMinus >= 0 && indexMinus < indexOp) {
        currentOp = "-";
        indexOp = indexMinus;
    }
    if (indexPlus >= 0 && indexPlus < indexOp) {
        currentOp = "+";
    }
    return currentOp;
},

show : function(string, value, operation) {
    string = this.trimForAbacus(string);
    if (this.display.base === 10) {
        switch (operation) {
        case "+":
            value += parseFloat(string);
            break;
        case "-":
            value -= parseFloat(string);
            if (value < 0) // no negatives
                value = 0;
            break;
        // no precedence yet
        case "*":
            value *= parseFloat(string);
            break;
        case "/":
            var rt = parseFloat(string);
            if (rt !== 0)
                value /= rt;
            else
                value = 0; // no divide by 0, actually infinite
            break;
        }
        string = this.trimForAbacus(value.toString());
    } else { //if (parseInt(string, this.display.base).toString(this.displayBase) === string) {
        switch (operation) {
        case "+":
            value += parseInt(string, this.display.base);
            break;
        case "-":
            value -= parseInt(string, this.display.base);
            if (value < 0) // no negatives
                value = 0;
            break;
        // no precedence yet
        case "*":
            value *= parseInt(string, this.display.base);
            break;
        case "/":
            var rt = parseInt(string, this.display.base);
            if (rt !== 0)
                value /= rt;
            else
                value = 0; // no divide by 0, actually infinite
            break;
        }
        string = this.trimForAbacus(value.toString(this.display.base));
    //} else {  // float
    }
    this.clearAbacus(this.display);
    this.setAbacus(this.display, string);
    return value;
},

onKeyPress : function(event) {
    var valueString = this.getSpan();
    if (event.keyCode === 13) { // enter
        event.preventDefault();
        this.setSpan(valueString);
        this.setCounter(valueString);
    }
},

onTouchStart : function(event) {
    event.preventDefault();
    this.pressedBead = this.getTouchPosition(event, 0);
    this.pick();
},

onMouseDown : function(event) {
    event.preventDefault();
    this.pressedBead = this.getCursorPosition(event);
    this.pick();
},

onTouchStop : function(event) {
    event.preventDefault();
    if (this.pressedBead === null) {
        return;
    }
    var bead = this.getTouchPosition(event, 1);
    this.place(bead, true, true);
},

onMouseUp : function(event) {
    event.preventDefault();
    if (this.pressedBead === null) {
        return;
    }
    var bead = this.getCursorPosition(event);
    this.place(bead, true, true);
},

onMouseOut : function(event) {
    if (delta === 0) {
        this.drawAbacus();
        this.pressedBead = null;
    }
},

// for initial image loading
onLoad : function(event) {
    this.drawAbacus();
    this.pressedBead = null;
},

pick : function() {
    if (delta !== 0 || this.pressedBead === null)
       return;
    if (this.pressedBead.deck === this.decks) {
        this.drawDecimalPointer(this.pressedBead.rail);
        return;
    }
    if (this.medieval) {
        this.drawRailPointer(this.pressedBead);
        return;
    }
    var move = this.findBeadsToMove(this.pressedBead);
    if (move === 0) {
        this.pressedBead = null;
    } else {
        this.drawBead(this.pressedBead, true, false);
    }
},

place : function(bead, show, record) {
    if (delta !== 0)
       return;
    if (bead === null) {
        if (this.pressedBead === null)
            return;
        this.drawAbacus();
        this.pressedBead = null;
        return;
    }
    if (bead.deck === this.decks) {
        if (bead.deck !== this.pressedBead.deck) {
            this.drawAbacus();
            return;
        }
        if (this.pressedBead.rail !== bead.rail) {
            bead.rail =
                this.decimalPosition + bead.rail - this.pressedBead.rail
                + ((this.checkPiece()) ? 1 : 0)
                + ((this.checkPiecePercent()) ? 1 : 0)
                + ((this.checkSubdeck()) ? 2 : 0);
            if (bead.rail < 0)
                bead.rail = 0;
            else if (bead.rail >= this.rails)
                 bead.rail = this.rails - 1;
        }
        this.shiftRails(this.decimalPosition, bead.rail
            - ((this.checkPiece()) ? 1 : 0)
            - ((this.checkPiecePercent()) ? 1 : 0)
            - ((this.checkSubdeck()) ? 2 : 0));
        this.setArabicNumeral(this.display, bead, 0);
        this.drawAbacus();
        return;
    }
    if (bead.deck !== this.pressedBead.deck ||
            bead.rail !== this.pressedBead.rail) {
        this.drawAbacus();
        return;
    }
    if (this.medieval) {
        this.placeCounter(bead, record);
        this.drawAbacus();
    } else {
        //alert("place: " + bead.deck + ", " +
        //    bead.rail + ", " + bead.cell);
        var move = this.findBeadsToMove(this.pressedBead);
        if (move === 0) {
            this.pressedBead = null;
            this.drawAbacus();
        } else {
            this.setArabicNumeral(this.display, this.pressedBead, move);
            var recordMove = new Move();
            recordMove.auxiliary = 0;
            recordMove.deck = bead.deck;
            recordMove.rail = bead.rail;
            recordMove.number = (this.deck[bead.deck].orient) ? move : -move;
            var spaces = this.findSpaces(this.pressedBead);
            if (animation && show) {
                timer = setInterval(drawMovement, 24, this, move, spaces);
            } else {
                this.drawAbacus();
                if (this.sound) {
                     bumpSound.play();
                }
                this.pressedBead = null;
                delta = 0;
            }
            if (record) {
                this.undo.push(recordMove);
                this.redo = new Array();
            }
        }
    }
},

shiftRails : function(oldRail, newRail) {
    var jump, offset, deck, rail;
    if (oldRail === newRail ||
            this.checkPiece() && newRail === -1 ||
            this.checkPiecePercent() && newRail < this.shiftPercent ||
            this.checkSubdeck() && newRail < 0 || // FIXME
            this.checkSign() && newRail === this.rails - 1
                - ((this.checkPiece()) ? 1 : 0)
                - ((this.checkPiecePercent()) ? 1 : 0)
                - ((this.checkSubdeck()) ? 2 : 0)) {
        return;
    }
    if (newRail > oldRail) {
        if (this.checkPiece() || this.checkSubdeck()) {
            jump = (this.checkPiece() ? 1 : 0)
                + (this.checkSubdeck() ? 2 : 0);
            offset = ((this.checkPiecePercent()) ? 1 : 0);
            for (deck = 0; deck < this.decks; deck++) {
                for (rail = oldRail; rail < newRail; rail++) {
                    this.beadPosition[deck][rail + offset] =
                        this.beadPosition[deck][rail + offset + jump];
                }
            }
        }
        if (this.checkPiecePercent()) {
            for (deck = 0; deck < this.decks; deck++) {
                for (rail = oldRail; rail < newRail; rail++) {
                    this.beadPosition[deck][rail - this.shiftPercent] =
                        this.beadPosition[deck][rail
                        - this.shiftPercent + 1];
                }
            }
        }
    } else if (newRail < oldRail) {
        if (this.checkPiecePercent()) {
            for (deck = 0; deck < this.decks; deck++) {
                for (rail = oldRail; rail >= newRail; rail--) {
                    this.beadPosition[deck][rail - this.shiftPercent] =
                        this.beadPosition[deck][rail
                        - this.shiftPercent - 1];
                }
            }
        }
        if (this.checkPiece() || this.checkSubdeck()) {
            jump = (this.checkPiece() ? 1 : 0)
                + (this.checkSubdeck() ? 2 : 0);
            offset = ((this.checkPiecePercent()) ? 1 : 0);
            for (deck = 0; deck < this.decks; deck++) {
                for (rail = oldRail + jump - 1; rail >= newRail + jump - 1;
                        rail--) {
                    this.beadPosition[deck][rail + offset] =
                        this.beadPosition[deck][rail + offset - jump];
                }
            }
        }
    }
    this.decimalPosition = newRail;
    // clear these out... toss up as to what is best here
    if (this.checkPiece()) {
        rail = this.decimalPosition
            + ((this.checkPiecePercent()) ? 1 : 0)
            + ((this.checkSubdeck()) ? 2 : 0);
        for (deck = 0; deck < this.decks; deck++) {
            if (this.deck[deck].orient) {
                this.beadPosition[deck][rail] = this.getPieces(deck);
            } else {
                this.beadPosition[deck][rail] = 0;
            }
        }
    }
    if (this.checkPiecePercent()) {
        rail = this.decimalPosition - this.shiftPercent;
        for (deck = 0; deck < this.decks; deck++) {
            if (this.deck[deck].orient) {
                this.beadPosition[deck][rail] = this.getPiecePercents(deck);
            } else {
                this.beadPosition[deck][rail] = 0;
            }
        }
    }
    if (this.checkSubdeck()) {
        for (var subdeck = 0; subdeck < this.subdecks; subdeck++) {
            if (this.deck[BOTTOM].orient) {
                this.subbeadPosition[subdeck] = this.getSubdeckBeads(subdeck);
            } else {
                this.subbeadPosition[subdeck] = 0;
            }
        }
    }
    if (this.sound) {
        // not actually possible to do on real abacus, so using different sound
        if (this.checkPiece() || this.checkPiecePercent()
                || this.checkSubdeck())
            dripSound.play();
        else
            moveSound.play();
    }
},

// View

rotateOutput : function(screenOutput) {
    return new Coord(this.frameSize.y - 1 - screenOutput.y, screenOutput.x);
},

getRailPositionX : function(rail) {
    return (this.beadWidth + this.beadGapX) * (this.rails - 1 - rail)
        + this.frameThickness + this.beadGapX
        + ((this.medieval) ? this.beadWidth : this.beadRadiusX);
},

getSubdeckPositionY : function(subdeckOffset) {
    return this.middleBarY + this.middleBarThickness
        + subdeckOffset * this.beadHeight;
},

/*
getDeckPositionY : function(deck) {
    if (deck === 0)
        return this.middleBarY + this.middleBarThickness;
    else if (deck === 1)
        return this.frameThickness;
    return 0;
},

getCellPositionY : function(deck, cell) {
    return getDeckPositionY(deck) + cell * this.beadHeight;
},
*/

drawFramePart : function(coord) {
    var i;
    if (this.vertical) {
        for (i = 0; i < coord.length; i++) {
            coord[i] = this.rotateOutput(coord[i]);
        }
    }
    this.drawingContext.beginPath();
    this.drawingContext.moveTo(coord[0].x, coord[0].y);
    for (i = 1; i < coord.length; i++) {
        this.drawingContext.lineTo(coord[i].x, coord[i].y);
    }
    this.drawingContext.closePath();
    this.drawingContext.fillStyle = this.frameColor;
    this.drawingContext.fill();
},

drawFrame : function() {
    /* no Miter
    this.drawingContext.beginPath();
    this.drawingContext.moveTo(0, 0);
    this.drawingContext.lineTo(this.frameSize.x, 0);
    this.drawingContext.lineTo(this.frameSize.x, this.frameSize.y);
    this.drawingContext.lineTo(0, this.frameSize.y);
    this.drawingContext.lineTo(0, this.frameThickness);
    this.drawingContext.lineTo(this.frameThickness, this.frameThickness);
    this.drawingContext.lineTo(this.frameThickness,
        this.frameSize.y - this.frameThickness);
    this.drawingContext.lineTo(this.frameSize.x - this.frameThickness,
        this.frameSize.y - this.frameThickness);
    this.drawingContext.lineTo(this.frameSize.x - this.frameThickness,
        this.frameThickness);
    this.drawingContext.lineTo(0.0, this.frameThickness);
    this.drawingContext.closePath();
    this.drawingContext.fillStyle = this.frameColor;
    this.drawingContext.fill(); */
    // Miter joint, why not :)
    var coord = new Array(4);
    coord[0] = new Coord(0, 0);
    coord[1] = new Coord(this.frameSize.x, 0);
    coord[2] = new Coord(this.frameSize.x - this.frameThickness,
        this.frameThickness);
    coord[3] = new Coord(this.frameThickness, this.frameThickness);
    this.drawFramePart(coord);
    coord[0] = new Coord(this.frameSize.x, this.frameSize.y);
    coord[1] = new Coord(0, this.frameSize.y);
    coord[2] = new Coord(this.frameThickness,
        this.frameSize.y - this.frameThickness);
    coord[3] = new Coord(this.frameSize.x - this.frameThickness,
        this.frameSize.y - this.frameThickness);
    this.drawFramePart(coord);
    if (this.slot || this.medieval) {
        coord[0] = new Coord(0, 0);
        coord[1] = new Coord(0, this.frameSize.y);
        coord[2] = new Coord(this.frameThickness,
            this.frameSize.y - this.frameThickness);
        coord[3] = new Coord(this.frameThickness, this.frameThickness);
        this.drawFramePart(coord);
        coord[0] = new Coord(this.frameSize.x, this.frameSize.y);
        coord[1] = new Coord(this.frameSize.x, 0);
        coord[2] = new Coord(this.frameSize.x - this.frameThickness,
            this.frameThickness);
        coord[3] = new Coord(this.frameSize.x - this.frameThickness,
            this.frameSize.y - this.frameThickness);
        this.drawFramePart(coord);
        return;
    }
    coord[0] = new Coord(0, 0);
    coord[1] = new Coord(0, this.middleBarY + this.frameThickness);
    coord[2] = new Coord(this.frameThickness,
        this.middleBarY);
    coord[3] = new Coord(this.frameThickness, this.frameThickness);
    this.drawFramePart(coord);
    coord[0] = new Coord(0, this.middleBarY);
    coord[1] = new Coord(0, this.frameSize.y);
    coord[2] = new Coord(this.frameThickness,
        this.frameSize.y - this.frameThickness);
    coord[3] = new Coord(this.frameThickness,
        this.middleBarY + this.frameThickness);
    this.drawFramePart(coord);
    coord[0] = new Coord(this.frameSize.x, this.frameSize.y);
    coord[1] = new Coord(this.frameSize.x, this.middleBarY);
    coord[2] = new Coord(this.frameSize.x - this.frameThickness,
        this.middleBarY + this.frameThickness);
    coord[3] = new Coord(this.frameSize.x - this.frameThickness,
        this.frameSize.y - this.frameThickness);
    this.drawFramePart(coord);
    coord[0] = new Coord(this.frameSize.x, 0);
    coord[1] = new Coord(this.frameSize.x, this.middleBarY + this.frameThickness);
    coord[2] = new Coord(this.frameSize.x - this.frameThickness,
        this.middleBarY);
    coord[3] = new Coord(this.frameSize.x - this.frameThickness,
        this.frameThickness);
    this.drawFramePart(coord);
    /* no Miter
    // Draw middle bar
    coord[0] = new Coord(this.frameThickness, this.middleBarY);
    coord[1] = new Coord(this.frameSize.x - this.frameThickness,
        this.middleBarY);
    coord[2] = new Coord(this.frameSize.x - this.frameThickness,
        this.middleBarY + this.middleBarThickness);
    coord[3] = new Coord(this.frameThickness,
        this.middleBarY + this.middleBarThickness);
    this.drawFramePart(coord);*/
    var frameThickness2 = this.frameThickness >> 1;
    coord[0] = new Coord(frameThickness2,
        this.middleBarY + frameThickness2);
    coord[1] = new Coord(this.frameThickness,
        this.middleBarY);
    coord[2] = new Coord(this.frameSize.x - this.frameThickness,
        this.middleBarY);
    coord[3] = new Coord(this.frameSize.x - frameThickness2,
        this.middleBarY + frameThickness2);
    this.drawFramePart(coord);
    coord[0] = new Coord(frameThickness2,
        this.middleBarY + frameThickness2);
    coord[1] = new Coord(this.frameSize.x - frameThickness2,
        this.middleBarY + frameThickness2);
    coord[2] = new Coord(this.frameSize.x - this.frameThickness,
        this.middleBarY + this.frameThickness);
    coord[3] = new Coord(this.frameThickness,
        this.middleBarY + this.frameThickness);
    this.drawFramePart(coord);
},

drawDecimalPointer : function(rail) {
    var coord0 = new Coord(this.getRailPositionX(rail) - 2,
       this.middleBarY + (this.middleBarThickness >> 1) - 2);
    var coord1 = new Coord(coord0.x + 4,
        this.middleBarY + (this.middleBarThickness >> 1) + 2);
    if (this.vertical) {
        coord0 = this.rotateOutput(coord0);
        coord1 = this.rotateOutput(coord1);
    }
    this.drawingContext.beginPath();
    this.drawingContext.moveTo(coord0.x, coord0.y);
    this.drawingContext.lineTo(coord1.x, coord0.y);
    this.drawingContext.lineTo(coord1.x, coord1.y);
    this.drawingContext.lineTo(coord0.x, coord1.y);
    this.drawingContext.closePath();
    this.drawingContext.fillStyle = this.beadColor[0][2];
    this.drawingContext.fill();
},

drawRailPointer : function(p) {
    var coord0 = new Coord(((this.rails - 1 - p.rail)
        * (this.beadWidth + this.beadGapX))
        - this.beadWidth * p.deck - 2
        + this.beadWidth + this.frameThickness + this.beadGapX,
        this.middleBarThickness + this.middleBarY - 2
        + ((this.deck[BOTTOM].cells * this.beadHeight) >> 1));
    var coord1 = new Coord(coord0.x + 4,
        coord0.y + 4);
    if (this.vertical) {
        coord0 = this.rotateOutput(coord0);
        coord1 = this.rotateOutput(coord1);
    }
    this.drawingContext.beginPath();
    this.drawingContext.moveTo(coord0.x, coord0.y);
    this.drawingContext.lineTo(coord1.x, coord0.y);
    this.drawingContext.lineTo(coord1.x, coord1.y);
    this.drawingContext.lineTo(coord0.x, coord1.y);
    this.drawingContext.closePath();
    this.drawingContext.fillStyle = this.beadColor[0][2];
    this.drawingContext.fill();
},

drawDecimalSeparator : function(rail) {
    var y = this.middleBarY;
    var coord0, coord1, coord2, coord3;
    var coord4, coord5;
    if (this.medieval) {
        if (this.decimalPosition < 1)
            return;
        // This is a made up symbol to allow showing of decimals
        var x = this.getRailPositionX(rail);
        var offset = 1;
        coord0 = new Coord(x + offset, y);
        coord1 = new Coord(x + 5 + offset, y + (this.middleBarThickness >> 1));
        coord2 = new Coord(x + 3 + offset, y + (this.middleBarThickness >> 1));
        coord3 = new Coord(x + offset, y + 2);
        coord4 = new Coord(x + offset, y + this.middleBarThickness);
        coord5 = new Coord(x + offset, y + this.middleBarThickness - 2);
        this.fillQuad(coord0, coord1, coord2, coord3);
        this.fillQuad(coord4, coord1, coord2, coord5);
        offset = 1 - this.railThickness % 2;
        coord0 = new Coord(x - offset, y);
        coord1 = new Coord(x - 5 - offset, y + (this.middleBarThickness >> 1));
        coord2 = new Coord(x - 3 - offset, y + (this.middleBarThickness >> 1));
        coord3 = new Coord(x - offset, y + 2);
        coord4 = new Coord(x - offset, y + this.middleBarThickness);
        coord5 = new Coord(x - offset, y + this.middleBarThickness - 2);
        this.fillQuad(coord0, coord1, coord2, coord3);
        this.fillQuad(coord4, coord1, coord2, coord5);
        return;
    }
    coord0 = new Coord(this.getRailPositionX(rail)
        - (this.railThickness >> 1) - 3, y);
    coord1 = new Coord(coord0.x + this.railThickness + 5,
        y + this.middleBarThickness);
    if (this.vertical) {
        coord0 = this.rotateOutput(coord0);
        coord1 = this.rotateOutput(coord1);
    }
    this.drawingContext.beginPath();
    this.drawingContext.moveTo(coord0.x, coord0.y);
    this.drawingContext.lineTo(coord1.x, coord0.y);
    this.drawingContext.lineTo(coord1.x, coord1.y);
    this.drawingContext.lineTo(coord0.x, coord1.y);
    this.drawingContext.closePath();
    this.drawingContext.fillStyle = this.beadColor[0][1];
    this.drawingContext.fill();
},

drawGroupSeparator : function(rail) {
    var y = this.middleBarY;
    var coord0, coord1, coord2, coord3;
    var coord4, coord5, coord6, coord7;
    if (this.medieval) {
        var x = this.getRailPositionX(rail) + 0.5;
        var offset = 1 - this.railThickness % 2;
        coord0 = new Coord(x - 5 - offset, y + 2);
        coord1 = new Coord(x - 3 - offset, y);
        coord2 = new Coord(x + 5, y + this.middleBarThickness - 2);
        coord3 = new Coord(x + 3, y + this.middleBarThickness);
        coord4 = new Coord(x - 5 - offset, y + this.middleBarThickness - 2);
        coord5 = new Coord(x - 3 - offset, y + this.middleBarThickness);
        coord6 = new Coord(x + 5, y + 2);
        coord7 = new Coord(x + 3, y);
        this.fillQuad(coord0, coord1, coord2, coord3);
        this.fillQuad(coord4, coord5, coord6, coord7);
        return;
    }
    coord0 = new Coord(this.getRailPositionX(rail)
        - (this.railThickness >> 1), y);
    coord1 = new Coord(coord0.x + this.railThickness,
        y + this.middleBarThickness);
    coord2 = new Coord(coord0.x - 1, coord0.y + 2);
    coord3 = new Coord(coord1.x + 1, coord1.y - 2);
    coord4 = new Coord(coord2.x - 1, coord2.y + 2);
    coord5 = new Coord(coord3.x + 1, coord3.y - 2);
    if (this.vertical) {
        coord0 = this.rotateOutput(coord0);
        coord1 = this.rotateOutput(coord1);
        coord2 = this.rotateOutput(coord2);
        coord3 = this.rotateOutput(coord3);
        coord4 = this.rotateOutput(coord4);
        coord5 = this.rotateOutput(coord5);
    }
    this.drawingContext.beginPath();
    this.drawingContext.moveTo(coord0.x, coord0.y);
    this.drawingContext.lineTo(coord1.x, coord0.y);
    this.drawingContext.lineTo(coord1.x, coord1.y);
    this.drawingContext.lineTo(coord0.x, coord1.y);
    this.drawingContext.closePath();
    this.drawingContext.fillStyle = this.beadColor[0][1];
    this.drawingContext.fill();
    this.drawingContext.beginPath();
    this.drawingContext.moveTo(coord2.x, coord2.y);
    this.drawingContext.lineTo(coord3.x, coord2.y);
    this.drawingContext.lineTo(coord3.x, coord3.y);
    this.drawingContext.lineTo(coord2.x, coord3.y);
    this.drawingContext.closePath();
    this.drawingContext.fillStyle = this.beadColor[0][1];
    this.drawingContext.fill();
    this.drawingContext.beginPath();
    this.drawingContext.moveTo(coord4.x, coord4.y);
    this.drawingContext.lineTo(coord5.x, coord4.y);
    this.drawingContext.lineTo(coord5.x, coord5.y);
    this.drawingContext.lineTo(coord4.x, coord5.y);
    this.drawingContext.closePath();
    this.drawingContext.fillStyle = this.beadColor[0][1];
    this.drawingContext.fill();
},

drawAllGroupSeparators : function(decimalPosition) {
    for (var separator = 1; separator <= div((this.rails
            - ((this.checkSign()) ? 1 : 0)
            - decimalPosition - ((this.checkPiece()) ? 1 : 0)
            - ((this.checkPiecePercent()) ? 1 : 0)
            - ((this.checkSubdeck()) ? 2 : 0)
            - 1), this.groupSize); separator++)
        this.drawGroupSeparator(decimalPosition
            + ((this.checkPiece()) ? 1 : 0)
            + ((this.checkPiecePercent()) ? 1 : 0)
            + ((this.checkSubdeck()) ? 2 : 0)
            + this.groupSize * separator);
},

fillQuad : function(coord0, coord1, coord2, coord3) {
    if (this.vertical) {
        coord0 = this.rotateOutput(coord0);
        coord1 = this.rotateOutput(coord1);
        coord2 = this.rotateOutput(coord2);
        coord3 = this.rotateOutput(coord3);
    }
    this.drawingContext.beginPath();
    this.drawingContext.moveTo(coord0.x, coord0.y);
    this.drawingContext.lineTo(coord1.x, coord1.y);
    this.drawingContext.lineTo(coord2.x, coord2.y);
    this.drawingContext.lineTo(coord3.x, coord3.y);
    this.drawingContext.closePath();
    this.drawingContext.fillStyle = this.beadColor[0][1];
    this.drawingContext.fill();
},

/*
// does not seem to work right
drawLine : function(coord0, coord1) {
    if (this.vertical) {
        coord0 = this.rotateOutput(coord0);
        coord1 = this.rotateOutput(coord1);
    }
    this.drawingContext.moveTo(coord0.x, coord0.y);
    this.drawingContext.lineTo(coord1.x, coord1.y);
    this.drawingContext.strokeStyle = this.beadColor[0][1];
    this.drawingContext.stroke();
},
*/

drawRomanI : function(rail) {
    var x = this.getRailPositionX(rail);
    var y = this.middleBarY;
    var coord0 = new Coord(x - 1, y);
    var coord1 = new Coord(x + 1, y);
    var coord2 = new Coord(x + 1, y + this.middleBarThickness);
    var coord3 = new Coord(x - 1, y + this.middleBarThickness);
    this.fillQuad(coord0, coord1, coord2, coord3);
},

drawRomanX : function(rail) {
    var x = this.getRailPositionX(rail);
    var y = this.middleBarY;
    var coord0 = new Coord(x - 4, y);
    var coord1 = new Coord(x - 2, y);
    var coord2 = new Coord(x + 4, y + this.middleBarThickness);
    var coord3 = new Coord(x + 2, y + this.middleBarThickness);
    var coord4 = new Coord(x - 4, y + this.middleBarThickness);
    var coord5 = new Coord(x - 2, y + this.middleBarThickness);
    var coord6 = new Coord(x + 4, y);
    var coord7 = new Coord(x + 2, y);
    this.fillQuad(coord0, coord1, coord2, coord3);
    this.fillQuad(coord4, coord5, coord6, coord7);
},

drawRomanC : function(rail) {
    var x = this.getRailPositionX(rail);
    var y = this.middleBarY;
    var coord0 = new Coord(x - 4, y + 1);
    var coord1 = new Coord(x - 2, y + 1);
    var coord2 = new Coord(x - 2, y + this.middleBarThickness - 1);
    var coord3 = new Coord(x - 4, y + this.middleBarThickness - 1);
    var coord4 = new Coord(x - 3, y);
    var coord5 = new Coord(x - 3, y + 2);
    var coord6 = new Coord(x + 3, y + 2);
    var coord7 = new Coord(x + 3, y);
    var coord8 = new Coord(x - 3, y + this.middleBarThickness);
    var coord9 = new Coord(x - 3, y + this.middleBarThickness - 2);
    var coord10 = new Coord(x + 3, y + this.middleBarThickness - 2);
    var coord11 = new Coord(x + 3, y + this.middleBarThickness);
    var coord12 = new Coord(x + 2, y + 1);
    var coord13 = new Coord(x + 4, y + 1);
    var coord14 = new Coord(x + 4, y + 3);
    var coord15 = new Coord(x + 2, y + 3);
    var coord16 = new Coord(x + 2, y + this.middleBarThickness - 1);
    var coord17 = new Coord(x + 4, y + this.middleBarThickness - 1);
    var coord18 = new Coord(x + 4, y + this.middleBarThickness - 3);
    var coord19 = new Coord(x + 2, y + this.middleBarThickness - 3);
    this.fillQuad(coord0, coord1, coord2, coord3);
    this.fillQuad(coord4, coord5, coord6, coord7);
    this.fillQuad(coord8, coord9, coord10, coord11);
    this.fillQuad(coord12, coord13, coord14, coord15);
    this.fillQuad(coord16, coord17, coord18, coord19);
},

drawRomanM : function(rail) {
    var x = this.getRailPositionX(rail);
    var y = this.middleBarY;
    var coord0, coord1, coord2, coord3;
    var coord4, coord5, coord6, coord7;
    var coord8, coord9, coord10, coord11;
    var coord12, coord13, coord14, coord15;
    var coord16, coord17, coord18, coord19;
    var coord20, coord21, coord22, coord23;
    var coord24, coord25, coord26, coord27;
    if (this.modernRoman) {
        coord0 = new Coord(x - 4, y);
        coord1 = new Coord(x - 2, y);
        coord2 = new Coord(x, y + this.middleBarThickness - 5);
        coord3 = new Coord(x, y + this.middleBarThickness - 4);
        coord4 = new Coord(x + 4, y);
        coord5 = new Coord(x + 2, y);
        coord6 = new Coord(x, y + this.middleBarThickness - 5);
        coord7 = new Coord(x, y + this.middleBarThickness - 4);
        coord8 = new Coord(x - 4, y);
        coord9 = new Coord(x - 2, y);
        coord10 = new Coord(x - 2, y + this.middleBarThickness);
        coord11 = new Coord(x - 4, y + this.middleBarThickness);
        coord12 = new Coord(x + 4, y);
        coord13 = new Coord(x + 2, y);
        coord14 = new Coord(x + 2, y + this.middleBarThickness);
        coord15 = new Coord(x + 4, y + this.middleBarThickness);
        this.fillQuad(coord0, coord1, coord2, coord3);
        this.fillQuad(coord4, coord5, coord6, coord7);
        this.fillQuad(coord8, coord9, coord10, coord11);
        this.fillQuad(coord12, coord13, coord14, coord15);
    } else {
        coord0 = new Coord(x - 1, y);
        coord1 = new Coord(x + 1, y);
        coord2 = new Coord(x + 1, y + this.middleBarThickness);
        coord3 = new Coord(x - 1, y + this.middleBarThickness);
        coord4 = new Coord(x - 5, y + 3);
        coord5 = new Coord(x - 4, y + 3);
        coord6 = new Coord(x - 4, y + this.middleBarThickness - 1);
        coord7 = new Coord(x - 5, y + this.middleBarThickness - 1);
        coord8 = new Coord(x + 5, y + 3);
        coord9 = new Coord(x + 4, y + 3);
        coord10 = new Coord(x + 4, y + this.middleBarThickness - 1);
        coord11 = new Coord(x + 5, y + this.middleBarThickness - 1);
        coord12 = new Coord(x - 4, y + 2);
        coord13 = new Coord(x - 2, y + 2);
        coord14 = new Coord(x - 2, y + 3);
        coord15 = new Coord(x - 4, y + 3);
        coord16 = new Coord(x - 4, y + this.middleBarThickness);
        coord17 = new Coord(x - 2, y + this.middleBarThickness);
        coord18 = new Coord(x - 2, y + this.middleBarThickness - 1);
        coord19 = new Coord(x - 4, y + this.middleBarThickness - 1);
        coord20 = new Coord(x + 4, y + 2);
        coord21 = new Coord(x + 2, y + 2);
        coord22 = new Coord(x + 2, y + 3);
        coord23 = new Coord(x + 4, y + 3);
        coord24 = new Coord(x + 4, y + this.middleBarThickness);
        coord25 = new Coord(x + 2, y + this.middleBarThickness);
        coord26 = new Coord(x + 2, y + this.middleBarThickness - 1);
        coord27 = new Coord(x + 4, y + this.middleBarThickness - 1);
        this.fillQuad(coord0, coord1, coord2, coord3);
        this.fillQuad(coord4, coord5, coord6, coord7);
        this.fillQuad(coord8, coord9, coord10, coord11);
        this.fillQuad(coord12, coord13, coord14, coord15);
        this.fillQuad(coord16, coord17, coord18, coord19);
        this.fillQuad(coord20, coord21, coord22, coord23);
        this.fillQuad(coord24, coord25, coord26, coord27);
    }
},

drawRomanx : function(rail) {
    var x = this.getRailPositionX(rail);
    var y = this.middleBarY;
    var coord0, coord1, coord2, coord3;
    var coord4, coord5, coord6, coord7;
    var coord8, coord9, coord10, coord11;
    var coord12, coord13, coord14, coord15;
    var coord16, coord17, coord18, coord19;
    var coord20, coord21, coord22, coord23;
    var coord24, coord25, coord26, coord27;
    var coord28, coord29, coord30, coord31;
    var coord32, coord33, coord34, coord35;
    var coord36, coord37, coord38, coord39;
    var coord40, coord41, coord42, coord43;
    var coord44, coord45, coord46, coord47;
    var coord48, coord49, coord50, coord51;
    if (this.modernRoman) {
        coord0 = new Coord(x - 4, y + 2);
        coord1 = new Coord(x - 2, y + 2);
        coord2 = new Coord(x + 4, y + this.middleBarThickness);
        coord3 = new Coord(x + 2, y + this.middleBarThickness);
        coord4 = new Coord(x - 4, y + this.middleBarThickness);
        coord5 = new Coord(x - 2, y + this.middleBarThickness);
        coord6 = new Coord(x + 4, y + 2);
        coord7 = new Coord(x + 2, y + 2);
        coord8 = new Coord(x - 4, y);
        coord9 = new Coord(x - 4, y + 1);
        coord10 = new Coord(x + 4, y + 1);
        coord11 = new Coord(x + 4, y);
        this.fillQuad(coord0, coord1, coord2, coord3);
        this.fillQuad(coord4, coord5, coord6, coord7);
        this.fillQuad(coord8, coord9, coord10, coord11);
    } else {
        coord0 = new Coord(x - 1, y);
        coord1 = new Coord(x + 1, y);
        coord2 = new Coord(x + 1, y + this.middleBarThickness);
        coord3 = new Coord(x - 1, y + this.middleBarThickness);
        coord4 = new Coord(x - 4, y + 4);
        coord5 = new Coord(x - 3, y + 4);
        coord6 = new Coord(x - 3, y + this.middleBarThickness - 1);
        coord7 = new Coord(x - 4, y + this.middleBarThickness - 1);
        coord8 = new Coord(x + 4, y + 4);
        coord9 = new Coord(x + 3, y + 4);
        coord10 = new Coord(x + 3, y + this.middleBarThickness - 1);
        coord11 = new Coord(x + 4, y + this.middleBarThickness - 1);
        coord12 = new Coord(x - 3, y + 3);
        coord13 = new Coord(x - 2, y + 3);
        coord14 = new Coord(x - 2, y + 4);
        coord15 = new Coord(x - 3, y + 4);
        coord16 = new Coord(x - 3, y + this.middleBarThickness);
        coord17 = new Coord(x - 2, y + this.middleBarThickness);
        coord18 = new Coord(x - 2, y + this.middleBarThickness - 1);
        coord19 = new Coord(x - 3, y + this.middleBarThickness - 1);
        coord20 = new Coord(x + 3, y + 3);
        coord21 = new Coord(x + 2, y + 3);
        coord22 = new Coord(x + 2, y + 4);
        coord23 = new Coord(x + 3, y + 4);
        coord24 = new Coord(x + 3, y + this.middleBarThickness);
        coord25 = new Coord(x + 2, y + this.middleBarThickness);
        coord26 = new Coord(x + 2, y + this.middleBarThickness - 1);
        coord27 = new Coord(x + 3, y + this.middleBarThickness - 1);
        coord28 = new Coord(x - 6, y + 2);
        coord29 = new Coord(x - 5, y + 2);
        coord30 = new Coord(x - 5, y + this.middleBarThickness - 1);
        coord31 = new Coord(x - 6, y + this.middleBarThickness - 1);
        coord32 = new Coord(x + 6, y + 2);
        coord33 = new Coord(x + 5, y + 2);
        coord34 = new Coord(x + 5, y + this.middleBarThickness - 1);
        coord35 = new Coord(x + 6, y + this.middleBarThickness - 1);
        coord36 = new Coord(x - 5, y + 1);
        coord37 = new Coord(x - 3, y + 1);
        coord38 = new Coord(x - 3, y + 2);
        coord39 = new Coord(x - 5, y + 2);
        coord40 = new Coord(x - 5, y + this.middleBarThickness);
        coord41 = new Coord(x - 4, y + this.middleBarThickness);
        coord42 = new Coord(x - 4, y + this.middleBarThickness - 1);
        coord43 = new Coord(x - 5, y + this.middleBarThickness - 1);
        coord44 = new Coord(x + 5, y + 1);
        coord45 = new Coord(x + 3, y + 1);
        coord46 = new Coord(x + 3, y + 2);
        coord47 = new Coord(x + 5, y + 2);
        coord48 = new Coord(x + 5, y + this.middleBarThickness);
        coord49 = new Coord(x + 4, y + this.middleBarThickness);
        coord50 = new Coord(x + 4, y + this.middleBarThickness - 1);
        coord51 = new Coord(x + 5, y + this.middleBarThickness - 1);
        this.fillQuad(coord0, coord1, coord2, coord3);
        this.fillQuad(coord4, coord5, coord6, coord7);
        this.fillQuad(coord8, coord9, coord10, coord11);
        this.fillQuad(coord12, coord13, coord14, coord15);
        this.fillQuad(coord16, coord17, coord18, coord19);
        this.fillQuad(coord20, coord21, coord22, coord23);
        this.fillQuad(coord24, coord25, coord26, coord27);
        this.fillQuad(coord28, coord29, coord30, coord31);
        this.fillQuad(coord32, coord33, coord34, coord35);
        this.fillQuad(coord36, coord37, coord38, coord39);
        this.fillQuad(coord40, coord41, coord42, coord43);
        this.fillQuad(coord44, coord45, coord46, coord47);
        this.fillQuad(coord48, coord49, coord50, coord51);
    }
},

drawRomanc : function(rail) {
    var x = this.getRailPositionX(rail);
    var y = this.middleBarY;
    var coord0, coord1, coord2, coord3;
    var coord4, coord5, coord6, coord7;
    var coord8, coord9, coord10, coord11;
    var coord12, coord13, coord14, coord15;
    var coord16, coord17, coord18, coord19;
    var coord20, coord21, coord22, coord23;
    var coord24, coord25, coord26, coord27;
    var coord28, coord29, coord30, coord31;
    var coord32, coord33, coord34, coord35;
    var coord36, coord37, coord38, coord39;
    var coord40, coord41, coord42, coord43;
    var coord44, coord45, coord46, coord47;
    var coord48, coord49, coord50, coord51;
    var coord52, coord53, coord54, coord55;
    var coord56, coord57, coord58, coord59;
    var coord60, coord61, coord62, coord63;
    var coord64, coord65, coord66, coord67;
    var coord68, coord69, coord70, coord71;
    var coord72, coord73, coord74, coord75;
    if (this.modernRoman) {
        coord0 = new Coord(x - 4, y + 3);
        coord1 = new Coord(x - 2, y + 3);
        coord2 = new Coord(x - 2, y + this.middleBarThickness - 1);
        coord3 = new Coord(x - 4, y + this.middleBarThickness - 1);
        coord4 = new Coord(x - 3, y + 2);
        coord5 = new Coord(x - 3, y + 4);
        coord6 = new Coord(x + 3, y + 4);
        coord7 = new Coord(x + 3, y + 2);
        coord8 = new Coord(x - 3, y + this.middleBarThickness);
        coord9 = new Coord(x - 3, y + this.middleBarThickness - 2);
        coord10 = new Coord(x + 3, y + this.middleBarThickness - 2);
        coord11 = new Coord(x + 3, y + this.middleBarThickness);
        coord12 = new Coord(x + 2, y + 3);
        coord13 = new Coord(x + 4, y + 3);
        coord14 = new Coord(x + 4, y + 5);
        coord15 = new Coord(x + 2, y + 5);
        coord16 = new Coord(x + 2, y + this.middleBarThickness - 1);
        coord17 = new Coord(x + 4, y + this.middleBarThickness - 1);
        coord18 = new Coord(x + 4, y + this.middleBarThickness - 3);
        coord19 = new Coord(x + 2, y + this.middleBarThickness - 3);
        coord20 = new Coord(x - 4, y);
        coord21 = new Coord(x - 4, y + 1);
        coord22 = new Coord(x + 4, y + 1);
        coord23 = new Coord(x + 4, y);
        this.fillQuad(coord0, coord1, coord2, coord3);
        this.fillQuad(coord4, coord5, coord6, coord7);
        this.fillQuad(coord8, coord9, coord10, coord11);
        this.fillQuad(coord12, coord13, coord14, coord15);
        this.fillQuad(coord16, coord17, coord18, coord19);
        this.fillQuad(coord20, coord21, coord22, coord23);
    } else {
        coord0 = new Coord(x - 1, y);
        coord1 = new Coord(x + 1, y);
        coord2 = new Coord(x + 1, y + this.middleBarThickness);
        coord3 = new Coord(x - 1, y + this.middleBarThickness);
        coord4 = new Coord(x - 4, y + 4);
        coord5 = new Coord(x - 3, y + 4);
        coord6 = new Coord(x - 3, y + this.middleBarThickness - 1);
        coord7 = new Coord(x - 4, y + this.middleBarThickness - 1);
        coord8 = new Coord(x + 4, y + 4);
        coord9 = new Coord(x + 3, y + 4);
        coord10 = new Coord(x + 3, y + this.middleBarThickness - 1);
        coord11 = new Coord(x + 4, y + this.middleBarThickness - 1);
        coord12 = new Coord(x - 3, y + 3);
        coord13 = new Coord(x - 2, y + 3);
        coord14 = new Coord(x - 2, y + 4);
        coord15 = new Coord(x - 3, y + 4);
        coord16 = new Coord(x - 3, y + this.middleBarThickness);
        coord17 = new Coord(x - 2, y + this.middleBarThickness);
        coord18 = new Coord(x - 2, y + this.middleBarThickness - 1);
        coord19 = new Coord(x - 3, y + this.middleBarThickness - 1);
        coord20 = new Coord(x + 3, y + 3);
        coord21 = new Coord(x + 2, y + 3);
        coord22 = new Coord(x + 2, y + 4);
        coord23 = new Coord(x + 3, y + 4);
        coord24 = new Coord(x + 3, y + this.middleBarThickness);
        coord25 = new Coord(x + 2, y + this.middleBarThickness);
        coord26 = new Coord(x + 2, y + this.middleBarThickness - 1);
        coord27 = new Coord(x + 3, y + this.middleBarThickness - 1);
        coord28 = new Coord(x - 6, y + 2);
        coord29 = new Coord(x - 5, y + 2);
        coord30 = new Coord(x - 5, y + this.middleBarThickness - 1);
        coord31 = new Coord(x - 6, y + this.middleBarThickness - 1);
        coord32 = new Coord(x + 6, y + 2);
        coord33 = new Coord(x + 5, y + 2);
        coord34 = new Coord(x + 5, y + this.middleBarThickness - 1);
        coord35 = new Coord(x + 6, y + this.middleBarThickness - 1);
        coord36 = new Coord(x - 5, y + 1);
        coord37 = new Coord(x - 3, y + 1);
        coord38 = new Coord(x - 3, y + 2);
        coord39 = new Coord(x - 5, y + 2);
        coord40 = new Coord(x - 5, y + this.middleBarThickness);
        coord41 = new Coord(x - 4, y + this.middleBarThickness);
        coord42 = new Coord(x - 4, y + this.middleBarThickness - 1);
        coord43 = new Coord(x - 5, y + this.middleBarThickness - 1);
        coord44 = new Coord(x + 5, y + 1);
        coord45 = new Coord(x + 3, y + 1);
        coord46 = new Coord(x + 3, y + 2);
        coord47 = new Coord(x + 5, y + 2);
        coord48 = new Coord(x + 5, y + this.middleBarThickness);
        coord49 = new Coord(x + 4, y + this.middleBarThickness);
        coord50 = new Coord(x + 4, y + this.middleBarThickness - 1);
        coord51 = new Coord(x + 5, y + this.middleBarThickness - 1);

        coord52 = new Coord(x - 8, y + 1);
        coord53 = new Coord(x - 7, y + 1);
        coord54 = new Coord(x - 7, y + this.middleBarThickness - 1);
        coord55 = new Coord(x - 8, y + this.middleBarThickness - 1);
        coord56 = new Coord(x + 8, y + 1);
        coord57 = new Coord(x + 7, y + 1);
        coord58 = new Coord(x + 7, y + this.middleBarThickness - 1);
        coord59 = new Coord(x + 8, y + this.middleBarThickness - 1);
        coord60 = new Coord(x - 7, y);
        coord61 = new Coord(x - 5, y);
        coord62 = new Coord(x - 5, y + 1);
        coord63 = new Coord(x - 7, y + 1);
        coord64 = new Coord(x - 7, y + this.middleBarThickness);
        coord65 = new Coord(x - 6, y + this.middleBarThickness);
        coord66 = new Coord(x - 6, y + this.middleBarThickness - 1);
        coord67 = new Coord(x - 7, y + this.middleBarThickness - 1);
        coord68 = new Coord(x + 7, y);
        coord69 = new Coord(x + 5, y);
        coord70 = new Coord(x + 5, y + 1);
        coord71 = new Coord(x + 7, y + 1);
        coord72 = new Coord(x + 7, y + this.middleBarThickness);
        coord73 = new Coord(x + 6, y + this.middleBarThickness);
        coord74 = new Coord(x + 6, y + this.middleBarThickness - 1);
        coord75 = new Coord(x + 7, y + this.middleBarThickness - 1);
        this.fillQuad(coord0, coord1, coord2, coord3);
        this.fillQuad(coord4, coord5, coord6, coord7);
        this.fillQuad(coord8, coord9, coord10, coord11);
        this.fillQuad(coord12, coord13, coord14, coord15);
        this.fillQuad(coord16, coord17, coord18, coord19);
        this.fillQuad(coord20, coord21, coord22, coord23);
        this.fillQuad(coord24, coord25, coord26, coord27);
        this.fillQuad(coord28, coord29, coord30, coord31);
        this.fillQuad(coord32, coord33, coord34, coord35);
        this.fillQuad(coord36, coord37, coord38, coord39);
        this.fillQuad(coord40, coord41, coord42, coord43);
        this.fillQuad(coord44, coord45, coord46, coord47);
        this.fillQuad(coord48, coord49, coord50, coord51);
        this.fillQuad(coord52, coord53, coord54, coord55);
        this.fillQuad(coord56, coord57, coord58, coord59);
        this.fillQuad(coord60, coord61, coord62, coord63);
        this.fillQuad(coord64, coord65, coord66, coord67);
        this.fillQuad(coord68, coord69, coord70, coord71);
        this.fillQuad(coord72, coord73, coord74, coord75);
    }
},

drawRomanm : function(rail) {
    var x = this.getRailPositionX(rail);
    var y = this.middleBarY;
    var coord0, coord1, coord2, coord3;
    var coord4, coord5, coord6, coord7;
    var coord8, coord9, coord10, coord11;
    var coord12, coord13, coord14, coord15;
    var coord16, coord17, coord18, coord19;
    if (this.modernRoman) {
        coord0 = new Coord(x - 4, y + 2);
        coord1 = new Coord(x - 2, y + 2);
        coord2 = new Coord(x, y + this.middleBarThickness - 4);
        coord3 = new Coord(x, y + this.middleBarThickness - 3);
        coord4 = new Coord(x + 4, y + 2);
        coord5 = new Coord(x + 2, y + 2);
        coord6 = new Coord(x, y + this.middleBarThickness - 4);
        coord7 = new Coord(x, y + this.middleBarThickness - 3);
        coord8 = new Coord(x - 4, y + 2);
        coord9 = new Coord(x - 2, y + 2);
        coord10 = new Coord(x - 2, y + this.middleBarThickness);
        coord11 = new Coord(x - 4, y + this.middleBarThickness);
        coord12 = new Coord(x + 4, y + 2);
        coord13 = new Coord(x + 2, y + 2);
        coord14 = new Coord(x + 2, y + this.middleBarThickness);
        coord15 = new Coord(x + 4, y + this.middleBarThickness);
        coord16 = new Coord(x - 4, y);
        coord17 = new Coord(x - 4, y + 1);
        coord18 = new Coord(x + 4, y + 1);
        coord19 = new Coord(x + 4, y);
        this.fillQuad(coord0, coord1, coord2, coord3);
        this.fillQuad(coord4, coord5, coord6, coord7);
        this.fillQuad(coord8, coord9, coord10, coord11);
        this.fillQuad(coord12, coord13, coord14, coord15);
        this.fillQuad(coord16, coord17, coord18, coord19);
    } else {
        coord0 = new Coord(x - 4, y + 2);
        coord1 = new Coord(x - 2, y + 2);
        coord2 = new Coord(x + 4, y + this.middleBarThickness);
        coord3 = new Coord(x + 2, y + this.middleBarThickness);
        coord4 = new Coord(x - 4, y + this.middleBarThickness);
        coord5 = new Coord(x - 2, y + this.middleBarThickness);
        coord6 = new Coord(x + 4, y + 2);
        coord7 = new Coord(x + 2, y + 2);
        coord8 = new Coord(x - 5, y);
        coord9 = new Coord(x - 4, y);
        coord10 = new Coord(x - 4, y + this.middleBarThickness);
        coord11 = new Coord(x - 5, y + this.middleBarThickness);
        coord12 = new Coord(x + 5, y);
        coord13 = new Coord(x + 4, y);
        coord14 = new Coord(x + 4, y + this.middleBarThickness);
        coord15 = new Coord(x + 5, y + this.middleBarThickness);
        coord16 = new Coord(x - 4, y);
        coord17 = new Coord(x - 4, y + 1);
        coord18 = new Coord(x + 4, y + 1);
        coord19 = new Coord(x + 4, y);
        this.fillQuad(coord0, coord1, coord2, coord3);
        this.fillQuad(coord4, coord5, coord6, coord7);
        this.fillQuad(coord8, coord9, coord10, coord11);
        this.fillQuad(coord12, coord13, coord14, coord15);
        this.fillQuad(coord16, coord17, coord18, coord19);
    }
},

drawRomanMarkers : function() {
    var unitPosition = this.decimalPosition + ((this.checkPiece()) ? 1 : 0)
        + ((this.checkPiecePercent()) ? 1 : 0)
        + ((this.checkSubdeck()) ? 2 : 0);
    var iRails = this.rails - unitPosition - ((this.checkSign()) ? 1 : 0);

    this.drawRomanI(unitPosition);
    if (iRails < 2)
        return;
    this.drawRomanX(unitPosition + 1);
    if (iRails < 3)
        return;
    this.drawRomanC(unitPosition + 2);
    if (iRails < 4)
        return;
    this.drawRomanM(unitPosition + 3);
    if (iRails < 5)
        return;
    this.drawRomanx(unitPosition + 4);
    if (iRails < 6)
        return;
    this.drawRomanc(unitPosition + 5);
    if (iRails < 7)
        return;
    this.drawRomanm(unitPosition + 6);
},

drawPiece : function(rail) {
    var x = this.getRailPositionX(rail);
    var y = this.middleBarY;
    var coord0, coord1, coord2, coord3;
    var coord4, coord5, coord6, coord7;
    var coord8, coord9, coord10, coord11;
    var coord12, coord13, coord14, coord15;
    if (this.slot) {
        coord0 = new Coord(x - 4, y + 1);
        coord1 = new Coord(x - 2, y + 1);
        coord2 = new Coord(x - 2, y + this.middleBarThickness - 1);
        coord3 = new Coord(x - 4, y + this.middleBarThickness - 1);
        coord4 = new Coord(x - 3, y);
        coord5 = new Coord(x - 3, y + 2);
        coord6 = new Coord(x + 3, y + 2);
        coord7 = new Coord(x + 3, y);
        coord8 = new Coord(x - 3, y + this.middleBarThickness);
        coord9 = new Coord(x - 3, y + this.middleBarThickness - 2);
        coord10 = new Coord(x + 3, y + this.middleBarThickness - 2);
        coord11 = new Coord(x + 3, y + this.middleBarThickness);
        coord12 = new Coord(x + 2, y + 1);
        coord13 = new Coord(x + 4, y + 1);
        coord14 = new Coord(x + 4, y + this.middleBarThickness - 1);
        coord15 = new Coord(x + 2, y + this.middleBarThickness - 1);
        this.fillQuad(coord0, coord1, coord2, coord3);
        this.fillQuad(coord4, coord5, coord6, coord7);
        this.fillQuad(coord8, coord9, coord10, coord11);
        this.fillQuad(coord12, coord13, coord14, coord15);
        return;
    }
    coord0 = new Coord(x - 4, y + (this.middleBarThickness >> 1) - 1);
    coord1 = new Coord(x - 4, y + (this.middleBarThickness >> 1) + 1);
    coord2 = new Coord(x + 4, y + (this.middleBarThickness >> 1) + 1);
    coord3 = new Coord(x + 4, y + (this.middleBarThickness >> 1) - 1);
    coord4 = new Coord(x - 1, y);
    coord5 = new Coord(x + 1, y);
    coord6 = new Coord(x + 1, y + this.middleBarThickness);
    coord7 = new Coord(x - 1, y + this.middleBarThickness);
    this.fillQuad(coord0, coord1, coord2, coord3);
    this.fillQuad(coord4, coord5, coord6, coord7);
},

drawRomanHalf : function(rail, offset) {
    var x = this.getRailPositionX(rail) - 4;
    var y = this.getSubdeckPositionY(this.getNumberSubbeadsOffset(offset));
    var coord0, coord1, coord2, coord3;
    var coord4, coord5, coord6, coord7;
    var coord8, coord9, coord10, coord11;
    var coord12, coord13, coord14, coord15;
    var coord16, coord17, coord18, coord19;
    var coord20, coord21, coord22, coord23;
    if (this.museum === "it") {
        coord0 = new Coord(x - 3, y);
        coord1 = new Coord(x + 3, y);
        coord2 = new Coord(x + 3, y + 2);
        coord3 = new Coord(x - 3, y + 2);
        coord4 = new Coord(x + 4, y + this.middleBarThickness - 2);
        coord5 = new Coord(x + 2, y + this.middleBarThickness - 1);
        coord6 = new Coord(x - 4, y + 2);
        coord7 = new Coord(x - 2, y + 1);
        coord8 = new Coord(x - 3, y + this.middleBarThickness);
        coord9 = new Coord(x + 3, y + this.middleBarThickness);
        coord10 = new Coord(x + 3, y + this.middleBarThickness - 2);
        coord11 = new Coord(x - 3, y + this.middleBarThickness - 2);
        coord12 = new Coord(x + 2, y + 1);
        coord13 = new Coord(x + 4, y + 1);
        coord14 = new Coord(x + 4, y + 3);
        coord15 = new Coord(x + 2, y + 3);
        coord16 = new Coord(x - 4, y + this.middleBarThickness - 1);
        coord17 = new Coord(x - 2, y + this.middleBarThickness - 1);
        coord18 = new Coord(x - 2, y + this.middleBarThickness - 3);
        coord19 = new Coord(x - 4, y + this.middleBarThickness - 3);
        this.fillQuad(coord0, coord1, coord2, coord3);
        this.fillQuad(coord4, coord5, coord6, coord7);
        this.fillQuad(coord8, coord9, coord10, coord11);
        this.fillQuad(coord12, coord13, coord14, coord15);
        this.fillQuad(coord16, coord17, coord18, coord19);
    } else if (this.museum === "uk") {
        coord0 = new Coord(x - 3, y);
        coord1 = new Coord(x + 3, y);
        coord2 = new Coord(x + 3, y + 2);
        coord3 = new Coord(x - 3, y + 2);
        coord4 = new Coord(x + 2, y + (this.middleBarThickness >> 1));
        coord5 = new Coord(x, y + (this.middleBarThickness >> 1));
        coord6 = new Coord(x - 4, y + 2);
        coord7 = new Coord(x - 2, y + 1);
        coord8 = new Coord(x + 2, y + (this.middleBarThickness >> 1) + 1);
        coord9 = new Coord(x, y + (this.middleBarThickness >> 1));
        coord10 = new Coord(x - 4, y + this.middleBarThickness - 2);
        coord11 = new Coord(x - 2, y + this.middleBarThickness - 1);
        coord12 = new Coord(x + 2, y + 1);
        coord13 = new Coord(x + 4, y + 1);
        coord14 = new Coord(x + 4, y + 3);
        coord15 = new Coord(x + 2, y + 3);
        coord16 = new Coord(x - 4, y + this.middleBarThickness - 1);
        coord17 = new Coord(x - 2, y + this.middleBarThickness - 1);
        coord18 = new Coord(x - 2, y + this.middleBarThickness - 3);
        coord19 = new Coord(x - 4, y + this.middleBarThickness - 3);
        coord20 = new Coord(x - 4, y + this.middleBarThickness - 2);
        coord21 = new Coord(x + 4, y + this.middleBarThickness - 2);
        coord22 = new Coord(x + 4, y + this.middleBarThickness);
        coord23 = new Coord(x - 4, y + this.middleBarThickness);
        this.fillQuad(coord0, coord1, coord2, coord3);
        this.fillQuad(coord4, coord5, coord6, coord7);
        this.fillQuad(coord8, coord9, coord10, coord11);
        this.fillQuad(coord12, coord13, coord14, coord15);
        this.fillQuad(coord16, coord17, coord18, coord19);
        this.fillQuad(coord20, coord21, coord22, coord23);
    } else if (this.museum === "fr") {
        coord0 = new Coord(x, y);
        coord1 = new Coord(x + 1, y + 1);
        coord2 = new Coord(x - 2, y + (this.middleBarThickness >> 1));
        coord3 = new Coord(x - 4, y + (this.middleBarThickness >> 1) - 1);
        coord4 = new Coord(x - 4, y + (this.middleBarThickness >> 1) - 1);
        coord5 = new Coord(x - 4, y + (this.middleBarThickness >> 1) + 1);
        coord6 = new Coord(x + 2, y + (this.middleBarThickness >> 1) + 1);
        coord7 = new Coord(x + 2, y + (this.middleBarThickness >> 1) - 1);
        coord8 = new Coord(x - 4, y + this.middleBarThickness - 2);
        coord9 = new Coord(x - 2, y + this.middleBarThickness - 2);
        coord10 = new Coord(x + 2, y + (this.middleBarThickness >> 1));
        coord11 = new Coord(x, y + (this.middleBarThickness >> 1));
        coord12 = new Coord(x - 4, y + this.middleBarThickness);
        coord13 = new Coord(x + 4, y + this.middleBarThickness);
        coord14 = new Coord(x + 4, y + this.middleBarThickness - 2);
        coord15 = new Coord(x - 4, y + this.middleBarThickness - 2);
        this.fillQuad(coord0, coord1, coord2, coord3);
        this.fillQuad(coord4, coord5, coord6, coord7);
        this.fillQuad(coord8, coord9, coord10, coord11);
        this.fillQuad(coord12, coord13, coord14, coord15);
    }
},

drawRomanQuarter : function(rail, offset) {
    var x = this.getRailPositionX(rail) - 4;
    var y = this.getSubdeckPositionY(this.getNumberSubbeadsOffset(offset));
    var coord0, coord1, coord2, coord3;
    var coord4, coord5, coord6, coord7;
    var coord8, coord9, coord10, coord11;
    if (this.museum === "it") {
        coord0 = new Coord(x + 4, y + 1);
        coord1 = new Coord(x + 2, y + 1);
        coord2 = new Coord(x + 2, y + this.middleBarThickness - 1);
        coord3 = new Coord(x + 4, y + this.middleBarThickness - 1);
        coord4 = new Coord(x + 3, y);
        coord5 = new Coord(x + 3, y + 2);
        coord6 = new Coord(x - 3, y + 2);
        coord7 = new Coord(x - 3, y);
        coord8 = new Coord(x + 3, y + this.middleBarThickness);
        coord9 = new Coord(x + 3, y + this.middleBarThickness - 2);
        coord10 = new Coord(x - 3, y + this.middleBarThickness - 2);
        coord11 = new Coord(x - 3, y + this.middleBarThickness);
        this.fillQuad(coord0, coord1, coord2, coord3);
        this.fillQuad(coord4, coord5, coord6, coord7);
        this.fillQuad(coord8, coord9, coord10, coord11);
    } else if (this.museum === "uk") {
        coord0 = new Coord(x + 3, y + 3);
        coord1 = new Coord(x + 1, y + 3);
        coord2 = new Coord(x + 1, y + this.middleBarThickness - 3);
        coord3 = new Coord(x + 3, y + this.middleBarThickness - 3);
        coord4 = new Coord(x + 2, y + 3);
        coord5 = new Coord(x + 3, y + 2);
        coord6 = new Coord(x - 2, y);
        coord7 = new Coord(x - 3, y + 1);
        coord8 = new Coord(x + 2, y + this.middleBarThickness - 3);
        coord9 = new Coord(x + 3, y + this.middleBarThickness - 2);
        coord10 = new Coord(x - 2, y + this.middleBarThickness);
        coord11 = new Coord(x - 3, y + this.middleBarThickness - 1);
        this.fillQuad(coord0, coord1, coord2, coord3);
        this.fillQuad(coord4, coord5, coord6, coord7);
        this.fillQuad(coord8, coord9, coord10, coord11);
    } else if (this.museum === "fr") {
        coord0 = new Coord(x + 3, y + 1);
        coord1 = new Coord(x + 1, y + 1);
        coord2 = new Coord(x + 1, y + this.middleBarThickness - 3);
        coord3 = new Coord(x + 3, y + this.middleBarThickness - 3);
        coord4 = new Coord(x + 2, y);
        coord5 = new Coord(x + 3, y + 1);
        coord6 = new Coord(x - 2, y + 3);
        coord7 = new Coord(x - 3, y + 2);
        coord8 = new Coord(x + 2, y + this.middleBarThickness - 3);
        coord9 = new Coord(x + 3, y + this.middleBarThickness - 2);
        coord10 = new Coord(x - 2, y + this.middleBarThickness);
        coord11 = new Coord(x - 3, y + this.middleBarThickness - 1);
        this.fillQuad(coord0, coord1, coord2, coord3);
        this.fillQuad(coord4, coord5, coord6, coord7);
        this.fillQuad(coord8, coord9, coord10, coord11);
    }
},

drawRomanTwelfth : function(rail, offset) {
    var x = this.getRailPositionX(rail) - 4;
    var y = this.getSubdeckPositionY(this.getNumberSubbeadsOffset(offset));
    var coord0, coord1, coord2, coord3;
    var coord4, coord5, coord6, coord7;
    var coord8, coord9, coord10, coord11;
    var coord12, coord13, coord14, coord15;
    if (this.museum === "it") {
        coord0 = new Coord(x - 4, y);
        coord1 = new Coord(x + 4, y);
        coord2 = new Coord(x + 4, y + 2);
        coord3 = new Coord(x - 4, y + 2);
        coord4 = new Coord(x - 4, y + this.middleBarThickness - 2);
        coord5 = new Coord(x - 2, y + this.middleBarThickness - 2);
        coord6 = new Coord(x + 4, y + 2);
        coord7 = new Coord(x + 2, y + 2);
        coord8 = new Coord(x - 4, y + this.middleBarThickness);
        coord9 = new Coord(x + 4, y + this.middleBarThickness);
        coord10 = new Coord(x + 4, y + this.middleBarThickness - 2);
        coord11 = new Coord(x - 4, y + this.middleBarThickness - 2);
        this.fillQuad(coord0, coord1, coord2, coord3);
        this.fillQuad(coord4, coord5, coord6, coord7);
        this.fillQuad(coord8, coord9, coord10, coord11);
    } else if (this.museum === "uk" || this.museum === "fr") {
        coord0 = new Coord(x - 3, y);
        coord1 = new Coord(x + 3, y);
        coord2 = new Coord(x + 3, y + 2);
        coord3 = new Coord(x - 3, y + 2);
        coord4 = new Coord(x - 4, y + this.middleBarThickness - 2);
        coord5 = new Coord(x - 2, y + this.middleBarThickness - 2);
        coord6 = new Coord(x + 4, y + 2);
        coord7 = new Coord(x + 3, y + 1);
        coord8 = new Coord(x - 4, y + this.middleBarThickness);
        coord9 = new Coord(x + 4, y + this.middleBarThickness);
        coord10 = new Coord(x + 4, y + this.middleBarThickness - 2);
        coord11 = new Coord(x - 4, y + this.middleBarThickness - 2);
        coord12 = new Coord(x - 2, y + 1);
        coord13 = new Coord(x - 4, y + 1);
        coord14 = new Coord(x - 4, y + 3);
        coord15 = new Coord(x - 2, y + 3);
        this.fillQuad(coord0, coord1, coord2, coord3);
        this.fillQuad(coord4, coord5, coord6, coord7);
        this.fillQuad(coord8, coord9, coord10, coord11);
        this.fillQuad(coord12, coord13, coord14, coord15);
    }
},

drawSubdeckMarkers : function(rail) {
    this.drawRomanHalf(rail, 2);
    if (this.subdecks > 1)
        this.drawRomanQuarter(rail, 1);
    if (this.subdecks > 2)
        this.drawRomanTwelfth(rail, 0);
},

drawSign : function(rail) {
    var x = this.getRailPositionX(rail);
    var y = this.middleBarY;
    var coord0 = new Coord(x - 4, y + (this.middleBarThickness >> 1) - 1);
    var coord1 = new Coord(x - 4, y + (this.middleBarThickness >> 1) + 1);
    var coord2 = new Coord(x + 4, y + (this.middleBarThickness >> 1) + 1);
    var coord3 = new Coord(x + 4, y + (this.middleBarThickness >> 1) - 1);
    this.fillQuad(coord0, coord1, coord2, coord3);
},

drawAnomaly : function(rail) {
    // This is a made up symbol to show the position of anomaly
    var x = this.getRailPositionX(rail);
    var y = this.middleBarY;
    var coord0 = new Coord(x - 4, y + 2);
    var coord1 = new Coord(x - 2, y);
    var coord2 = new Coord(x + 4, y + this.middleBarThickness - 2);
    var coord3 = new Coord(x + 2, y + this.middleBarThickness);
    var coord4 = new Coord(x - 4, y + this.middleBarThickness - 2);
    var coord5 = new Coord(x - 2, y + this.middleBarThickness);
    var coord6 = new Coord(x + 4, y + 2);
    var coord7 = new Coord(x + 2, y);
    this.fillQuad(coord0, coord1, coord2, coord3);
    this.fillQuad(coord4, coord5, coord6, coord7);
    if (this.medieval) {
        this.drawSign(rail);
    }
},

drawAnomalies : function() {
    var unitPosition = this.decimalPosition
        + ((this.checkPiece()) ? 1 : 0)
        + ((this.checkPiecePercent()) ? 1 : 0)
        + ((this.checkSubdeck()) ? 2 : 0);
    var iRails = this.rails - unitPosition - ((this.checkSign()) ? 1 : 0);
    if (iRails > this.shiftAnomaly && this.anomaly > 0)
        this.drawAnomaly(unitPosition + this.shiftAnomaly);
    if (iRails > this.shiftAnomalySq && this.anomalySq > 0)
        this.drawAnomaly(unitPosition + this.shiftAnomalySq);
},

drawAllMarkers : function() {
    if (this.checkPiece()) {
        this.drawPiece(this.decimalPosition
            + ((this.checkPiecePercent()) ? 1 : 0)
            + ((this.checkSubdeck()) ? 2 : 0));
    }
    if (this.checkPiecePercent()) {
        this.drawPiece(this.decimalPosition - this.shiftPercent);
    }
    if (this.checkSign(this)) {
        this.drawSign(this.rails - 1);
    }
    if (this.anomaly > 0 || this.anomalySq > 0) {
        this.drawAnomalies();
        if (this.anomalySq > 0) {
            this.drawAllGroupSeparators(this.decimalPosition + this.anomalySq);
        } else {
            this.drawAllGroupSeparators(this.decimalPosition + this.anomaly);
        }
    } else if (this.slot) {
        this.drawRomanMarkers();
        return;
    } else {
        this.drawAllGroupSeparators(this.decimalPosition);
    }
    this.drawDecimalSeparator(this.decimalPosition
        + ((this.checkPiece()) ? 1 : 0)
        + ((this.checkPiecePercent()) ? 1 : 0)
        + ((this.checkSubdeck()) ? 2 : 0));
},

drawRail : function(curSpace, highlight) {
    var y;
    var x = this.getRailPositionX(curSpace.rail) - (this.railThickness >> 1);
    if (curSpace.deck === 0)
        y = this.middleBarY + this.middleBarThickness;
    else if (curSpace.deck === 1)
        y = this.frameThickness;
    var subdeck = -1;
    var subposition = 0;
    var subcell = curSpace.cell;
    if (curSpace.rail === this.decimalPosition + 1
            + ((this.checkPiecePercent()) ? 1 : 0) && this.checkSubdeck()) {
        if (this.getSubdeckSlotsSeparate(this.museum)) {
            subdeck = this.getSubdeckFromPosition(subcell);
            subposition = this.getSubpositionSubdeck(subcell);
        }
    }
    y += curSpace.cell * this.beadHeight;
    var beads = this.deck[curSpace.deck].beads;
    var spaces = this.deck[curSpace.deck].spaces;
    var coord0;
    var coord1;
    if (this.medieval && curSpace.deck === 0) {
        coord0 = new Coord(x, y - this.middleBarThickness
            - this.deck[TOP].cells * this.beadHeight);
        coord1 = new Coord(x + this.railThickness, y + this.beadHeight);
    } else if  (this.medieval && curSpace.deck !== 0) {
        return;
    } else if (this.slot && (curSpace.cell === 0 ||
            (subdeck !== -1 && subposition === 0))) {
        coord0 = new Coord(x + 1,
            y + 3 * (this.beadHeight >> 3));
        coord1 = new Coord(x + this.railThickness - 1,
            y + 3 * (this.beadHeight >> 3) + 1);
        if (this.vertical) {
            coord0 = this.rotateOutput(coord0);
            coord1 = this.rotateOutput(coord1);
        }
        this.drawingContext.beginPath();
        this.drawingContext.moveTo(coord0.x, coord0.y);
        this.drawingContext.lineTo(coord0.x, coord1.y);
        this.drawingContext.lineTo(coord1.x, coord1.y);
        this.drawingContext.lineTo(coord1.x, coord0.y);
        this.drawingContext.closePath();
        this.drawingContext.fillStyle = this.border;
        this.drawingContext.fill();
        coord0 = new Coord(x, y + 3 * (this.beadHeight >> 3) + 1);
        coord1 = new Coord(x + this.railThickness, y + this.beadHeight);
    } else if (this.slot && (curSpace.cell === beads + spaces - 1 ||
            (subdeck !== -1
            && subposition === this.getSubdeckBeads(subdeck)))) {
        coord0 = new Coord(x + 1,
            y + this.beadHeight - 3 * (this.beadHeight >> 3) - 1);
        coord1 = new Coord(x + this.railThickness - 1,
            y + this.beadHeight - 3 * (this.beadHeight >> 3));
        if (this.vertical) {
            coord0 = this.rotateOutput(coord0);
            coord1 = this.rotateOutput(coord1);
        }
        this.drawingContext.beginPath();
        this.drawingContext.moveTo(coord0.x, coord0.y);
        this.drawingContext.lineTo(coord0.x, coord1.y);
        this.drawingContext.lineTo(coord1.x, coord1.y);
        this.drawingContext.lineTo(coord1.x, coord0.y);
        this.drawingContext.closePath();
        this.drawingContext.fillStyle = this.border;
        this.drawingContext.fill();
        coord0 = new Coord(x, y);
        coord1 = new Coord(x + this.railThickness,
            y + this.beadHeight - 3 * (this.beadHeight >> 3) - 1);
    } else {
        coord0 = new Coord(x, y);
        coord1 = new Coord(x + this.railThickness, y + this.beadHeight);
    }
    if (this.vertical) {
        coord0 = this.rotateOutput(coord0);
        coord1 = this.rotateOutput(coord1);
    }
    var color = (highlight) ? 2 : this.railIndex;
    this.drawingContext.beginPath();
    this.drawingContext.moveTo(coord0.x, coord0.y);
    this.drawingContext.lineTo(coord0.x, coord1.y);
    this.drawingContext.lineTo(coord1.x, coord1.y);
    this.drawingContext.lineTo(coord1.x, coord0.y);
    this.drawingContext.closePath();
    if (this.slot || this.medieval)
        this.drawingContext.fillStyle = this.border;
    else
        this.drawingContext.fillStyle = this.railColor[color][1];
    this.drawingContext.fill();
    // add some lighting
    if (!(this.slot || this.medieval)) {
        var diff;
        if (this.vertical) {
            diff = coord1.y - coord0.y;
        } else {
            diff = coord1.x - coord0.x;
        }
        if (diff < 2) {
            return;
        }
        this.drawingContext.beginPath();
        if (this.vertical) {
            this.drawingContext.moveTo(coord0.x, coord1.y);
            this.drawingContext.lineTo(coord1.x, coord1.y);
            this.drawingContext.lineTo(coord1.x, coord1.y - 1);
            this.drawingContext.lineTo(coord0.x, coord1.y - 1);
        } else {
            this.drawingContext.moveTo(coord1.x, coord0.y);
            this.drawingContext.lineTo(coord1.x, coord1.y);
            this.drawingContext.lineTo(coord1.x - 1, coord1.y);
            this.drawingContext.lineTo(coord1.x - 1, coord0.y);
        }
        this.drawingContext.closePath();
        this.drawingContext.fillStyle = this.railColor[color][2];
        this.drawingContext.fill();
        this.drawingContext.beginPath();
        if (this.vertical) {
            this.drawingContext.moveTo(coord0.x, coord0.y);
            this.drawingContext.lineTo(coord1.x, coord0.y);
            this.drawingContext.lineTo(coord1.x, coord0.y + 1);
            this.drawingContext.lineTo(coord0.x, coord0.y + 1);
        } else {
            this.drawingContext.moveTo(coord0.x, coord0.y);
            this.drawingContext.lineTo(coord0.x, coord1.y);
            this.drawingContext.lineTo(coord0.x + 1, coord1.y);
            this.drawingContext.lineTo(coord0.x + 1, coord0.y);
        }
        this.drawingContext.closePath();
        this.drawingContext.fillStyle = this.railColor[color][0];
        this.drawingContext.fill();
    }
},

drawRailHole : function(curSpace) {
    var y;
    var x = this.getRailPositionX(curSpace.rail) - (this.railThickness >> 1);
    if (curSpace.deck === 0)
        y = this.middleBarY + this.middleBarThickness;
    else if (curSpace.deck === 1)
        y = this.frameThickness;
    y += curSpace.cell * this.beadHeight;
    var coord0;
    var coord1;
    if (this.medieval && curSpace.deck === 0) {
        coord0 = new Coord(x, y - this.middleBarThickness
            - this.deck[TOP].cells * this.beadHeight
            + (this.beadHeight >> 1) - (this.beadHeight >> 3));
        coord1 = new Coord(x + this.railThickness, y +
            (this.beadHeight >> 1) + (this.beadHeight >> 3));
    } else if  (this.medieval && curSpace.deck !== 0) {
        return;
    } else {
        coord0 = new Coord(x, y + (this.beadHeight >> 1) - (this.beadHeight >> 3));
        coord1 = new Coord(x + this.railThickness, y + (this.beadHeight >> 1) + (this.beadHeight >> 3));
    }
    if (this.vertical) {
        coord0 = this.rotateOutput(coord0);
        coord1 = this.rotateOutput(coord1);
    }
    this.drawingContext.beginPath();
    this.drawingContext.moveTo(coord0.x, coord0.y);
    this.drawingContext.lineTo(coord0.x, coord1.y);
    this.drawingContext.lineTo(coord1.x, coord1.y);
    this.drawingContext.lineTo(coord1.x, coord0.y);
    this.drawingContext.closePath();
    if (this.slot || this.medieval)
        this.drawingContext.fillStyle = this.border;
    else
        this.drawingContext.fillStyle = this.railColor[this.railIndex][1];
    // can not make darker
    this.drawingContext.fill();
    // add some lighting
    if (!(this.slot || this.medieval)) {
        var diff;
        if (this.vertical) {
            diff = coord1.y - coord0.y;
        } else {
            diff = coord1.x - coord0.x;
        }
        if (diff < 2) {
            return;
        }
        this.drawingContext.beginPath();
        if (this.vertical) {
            this.drawingContext.moveTo(coord0.x, coord1.y);
            this.drawingContext.lineTo(coord1.x, coord1.y);
            this.drawingContext.lineTo(coord1.x, coord1.y - 1);
            this.drawingContext.lineTo(coord0.x, coord1.y - 1);
        } else {
            this.drawingContext.moveTo(coord1.x, coord0.y);
            this.drawingContext.lineTo(coord1.x, coord1.y);
            this.drawingContext.lineTo(coord1.x - 1, coord1.y);
            this.drawingContext.lineTo(coord1.x - 1, coord0.y);
        }
        this.drawingContext.closePath();
        this.drawingContext.fillStyle = this.railColor[this.railIndex][2];
        this.drawingContext.fill();
        this.drawingContext.beginPath();
        if (this.vertical) {
            this.drawingContext.moveTo(coord0.x, coord0.y);
            this.drawingContext.lineTo(coord1.x, coord0.y);
            this.drawingContext.lineTo(coord1.x, coord0.y + 1);
            this.drawingContext.lineTo(coord0.x, coord0.y + 1);
        } else {
            this.drawingContext.moveTo(coord0.x, coord0.y);
            this.drawingContext.lineTo(coord0.x, coord1.y);
            this.drawingContext.lineTo(coord0.x + 1, coord1.y);
            this.drawingContext.lineTo(coord0.x + 1, coord0.y);
        }
        this.drawingContext.closePath();
        this.drawingContext.fillStyle = this.railColor[this.railIndex][0];
        this.drawingContext.fill();
    }

},

drawLineAndCounter : function(rail, highlight) {
    //only one has a line
    var number = this.beadPosition[BOTTOM][rail];
    var curCounter = new Bead(BOTTOM, rail, number, -1);
    //this.drawCounters(curCounter, number, false, highlight);
    this.drawCounters(curCounter, number, true, highlight);
    number = this.beadPosition[TOP][rail];
    curCounter = new Bead(TOP, rail, number, -1);
    this.drawCounters(curCounter, number, true, highlight);
},

highlightRail : function(auxiliary, rail, highlight) {
    var newRail = this.partOffset(auxiliary, rail);
    if (newRail < 0)
        log("Error: drawing rail " + rail);
    else
        this.drawBeadRail(newRail, highlight);
    if (DEBUG)
        log("highlight rail=" + rail +
            ", newRail=" + newRail);
},

highlightRails : function(auxiliary) {
    //var delay = 10;

    if (this.medieval) {
        return;
    }
    /*for (var rail = -this.decimalPostion; rail < this.rails - this.decimalPosition; rail++) {
         this.highlightRail(auxiliary, rail, true);
         try {
             Thread.sleep(delay);
         } catch (e) {
             //e.printStackTrace();
         }
         this.highlightRail(auxiliary, rail, false);
    }
    try {
        Thread.sleep(delay);
    } catch (e) {
        //e.printStackTrace();
    }
    for (var rail = this.rails - this.decimalPosition - 1; rail >= -this.decimalPosition; rail--) {
        this.highlightRail(auxiliary, rail, true);
        try {
             Thread.sleep(delay);
        } catch (e) {
             //e.printStackTrace();
        }
        this.highlightRail(auxiliary, rail, false);
    }*/
},

/* used by AbacusTeach */
drawBeadRail : function(rail, highlight) {
    /*if ((this.deck[BOTTOM].pieces != 0 &&
            (rail == this.decimalPosition - 1)) ||
            (this.deck[BOTTOM].piecePercents != 0 &&
            (rail == this.decimalPosition -
            this.shiftPercent - 1 -
            ((this.deck[BOTTOM].pieces == 0) ?
            0 : 1))) || (this.checkSubdeck() &&
            (rail == this.decimalPosition - 2 ||
            rail == this.decimalPosition - 3))) {
        return;
    }*/
    if (this.medieval) {
        this.drawLineAndCounter(rail, highlight);
        return;
    }
    for (var deck = BOTTOM; deck <= TOP; deck++) {
        var position = this.beadPosition[deck][rail];
        var spaces = this.deck[deck].spaces;
        var cells = this.deck[deck].cells;
        var limit = position + spaces;
        for (var cell = 0; cell < cells; cell++) {
            var curBead;
            if (cell >= position + spaces) {
                curBead = new Bead(deck, rail, cell, cell - spaces);
                this.drawBead(curBead, false, highlight);
            } else if (cell < position) {
                curBead = new Bead(deck, rail, cell, cell);
                this.drawBead(curBead, false, highlight);
            }
        }
        for (var space = position; space < limit; space++) {
            var curSpace = new Bead(deck, rail, space, -1);
            this.drawRail(curSpace, highlight);
        }
    }
},

drawRails : function() {
    for (var deck = 0; deck < this.decks; deck++) {
        var spaces = this.deck[deck].spaces;
        var cells = this.deck[deck].cells;
        var pieces = this.getPieces(deck);
        var pieceSpaces = this.getPieceSpaces(deck);
        var piecePercents = this.getPiecePercents(deck);
        var piecePercentSpaces = this.getPiecePercentSpaces(deck);
        var curSpace;
        for (var rail = 0; rail < this.rails; rail++) {
            var position = (this.medieval) ? 0 : this.beadPosition[deck][rail];
            var limit;
            if (rail === this.decimalPosition
                    + ((this.checkPiecePercent()) ? 1 : 0)
                    + ((this.checkSubdeck()) ? 2 : 0) && this.checkPiece()) {
                if (pieces <= 0)
                    continue;
                limit = position + pieceSpaces;
            } else if (rail === this.decimalPosition - this.shiftPercent
                    && this.checkPiecePercent()) {
                if (piecePercents <= 0)
                    continue;
                limit = position + piecePercentSpaces;
            } else if (rail === this.decimalPosition + 1
                    + ((this.checkPiecePercent()) ? 1 : 0)
                    && this.checkSubdeck()) {
                if (deck === 0) {
                    for (var subdeck = 0; subdeck < this.subdecks; subdeck++) {
                        var specialOffset =
                            this.getNumberSubbeadsOffset(subdeck);
                        position = this.subbeadPosition[subdeck]
                            + specialOffset;
                        limit = position + SUBDECK_SPACES;
                        for (var cell = position; cell < limit; cell++) {
                            curSpace = new Bead(deck, rail, cell, cell);
                            this.drawRail(curSpace, false);
                        }
                    }
                }
                continue;
            } else if (rail === this.decimalPosition
                    + ((this.checkPiecePercent()) ? 1 : 0)
                    && this.checkSubdeck()) {
                continue;
            } else if (rail === this.rails - 1 && this.checkSign()) {
                if (deck !== 0)
                    continue;
                limit = position + cells - 1;
            } else {
                limit = position + spaces;
            }
            limit = (this.medieval) ? cells : limit;
            for (var space = position; space < limit; space++) {
                curSpace = new Bead(deck, rail, space, -1);
                this.drawRail(curSpace, false);
            }
        }
    }
},

drawAllCounters : function() {
    for (var deck = 0; deck < this.decks; deck++) {
        for (var rail = 0; rail < this.rails; rail++) {
            var number = this.beadPosition[deck][rail];
            var curCounter = new Bead(deck, rail, number, -1);
            this.drawCounters(curCounter, number, false, false);
        }
    }
},

drawAllBeads : function() {
    for (var deck = 0; deck < this.decks; deck++) {
        var spaces = this.deck[deck].spaces;
        var cells = this.deck[deck].cells;
        var pieces = this.getPieces(deck);
        var pieceSpaces = this.getPieceSpaces(deck);
        var piecePercents = this.getPiecePercents(deck);
        var piecePercentSpaces = this.getPiecePercentSpaces(deck);
        var cell, curBead;
        for (var rail = 0; rail < this.rails; rail++) {
            var position = this.beadPosition[deck][rail];

            if (rail === this.decimalPosition
                    + ((this.checkPiecePercent()) ? 1 : 0)
                    + ((this.checkSubdeck()) ? 2 : 0) && this.checkPiece()) {
                if (pieces > 0) {
                    for (cell = 0; cell < cells; cell++) {
                        if (cell >= position + pieceSpaces) {
                            curBead = new Bead(deck, rail,
                                cell, cell - pieceSpaces);
                            this.drawBead(curBead, false, false);
                        } else if (cell < position) {
                            curBead = new Bead(deck, rail, cell, cell);
                            this.drawBead(curBead, false, false);
                        }
                    }
                }
            } else if (rail === this.decimalPosition - this.shiftPercent
                    && this.checkPiecePercent()) {
                if (piecePercents > 0) {
                    for (cell = 0; cell < cells; cell++) {
                        if (cell >= position + piecePercentSpaces) {
                            curBead = new Bead(deck, rail,
                                cell, cell - piecePercentSpaces);
                            this.drawBead(curBead, false, false);
                        } else if (cell < position) {
                            curBead = new Bead(deck, rail, cell, cell);
                            this.drawBead(curBead, false, false);
                        }
                    }
                }
            } else if (rail === this.decimalPosition + 1
                    + ((this.checkPiecePercent()) ? 1 : 0)
                    && this.checkSubdeck()) {
                if (deck === 0) {
                    for (var subdeck = 0; subdeck < this.subdecks; subdeck++) {
                        var specialOffset =
                            this.getNumberSubbeadsOffset(subdeck);
                        position = this.subbeadPosition[subdeck]
                            + specialOffset;
                        for (cell = specialOffset;
                                cell < position; cell++) {
                            curBead = new Bead(deck, rail, cell, cell);
                            this.drawBead(curBead, false, false);
                        }
                        for (cell = position + SUBDECK_SPACES;
                                cell < specialOffset +
                               this.getSubdeckCells(subdeck); cell++) {
                            curBead = new Bead(deck, rail, cell, cell);
                            this.drawBead(curBead, false, false);
                        }
                    }
                }
            } else if (rail === this.decimalPosition
                    + ((this.checkPiecePercent()) ? 1 : 0)
                    && this.checkSubdeck()) {
                if (deck === 0)
                    this.drawSubdeckMarkers(rail);
            } else if (rail === this.rails - 1 && this.checkSign()) {
                if (deck === 0) {
                    for (cell = 0; cell < cells; cell++) {
                         if (cell >= position + cells - 1) {
                             curBead = new Bead(deck, rail,
                                 cell, cell - cells + 1);
                             this.drawBead(curBead, false, false);
                         } else if (cell < position) {
                             curBead = new Bead(deck, rail, cell, cell);
                             this.drawBead(curBead, false, false);
                         }
                     }
                }
            } else {
                for (cell = 0; cell < cells; cell++) {
                    if (cell >= position + spaces) {
                        curBead = new Bead(deck, rail, cell, cell - spaces);
                        this.drawBead(curBead, false, false);
                    } else if (cell < position) {
                        curBead = new Bead(deck, rail, cell, cell);
                        this.drawBead(curBead, false, false);
                    }
                }
            }
        }
    }
},

drawAbacus : function() {
    if (this.vertical) {
        this.drawingContext.clearRect(0, 0, this.frameSize.y, this.frameSize.x);
    } else {
        this.drawingContext.clearRect(0, 0, this.frameSize.x, this.frameSize.y);
    }
    this.drawFrame();
    this.drawAllMarkers();
    this.drawRails();
    if (this.medieval) {
        this.drawAllCounters();
    } else {
        this.drawAllBeads();
    }
},

eraseBead : function(start, size) {
    if (this.vertical) {
        start = this.rotateOutput(start);
        var temp = size.x;
        size.x = size.y;
        size.y = temp;
    }
    this.drawingContext.clearRect(start.x, start.y,
        size.x, size.y);
},

/*setAbacusStart : function(p, start, offset) {
    start.x = (this.rails - 1 - p.rail)
        * (this.beadWidth + this.beadGapX)
        + this.beadRadiusX + this.frameThickness + this.beadGapX;
    start.y = (((p.deck === 0) ? 1 : 0) * this.middleBarY)
        + p.cell * this.beadHeight
        + this.beadRadiusY + this.frameThickness + offset;
    if (this.vertical)
        start = this.rotateOutput(start);
},*/

drawEllipsePosition : function(p, color, special, start) {
    var shade = 1 + special;
    var radius = new Coord(this.beadWidth >> 1, this.beadHeight >> 1);
    var centerX = start.x;
    var centerY = start.y;
    var step = 0.01;
    var counter = step;
    var pi2 = Math.PI * 2 - step;

    if (radius.x < 1 || radius.y < 1) {
         return;
    }
    this.drawingContext.beginPath();
    if (radius.x === radius.y) {
        this.drawingContext.arc(start.x, start.y, radius.x,
            0, Math.PI * 2, false);
    } else {
        if (this.vertical) {
            var temp = radius.x;
            radius.x = radius.y;
            radius.y = temp;
        }
        this.drawingContext.moveTo(centerX + radius.x * Math.cos(0),
            centerY + radius.y * Math.sin(0));
        for (; counter < pi2; counter += step) {
            this.drawingContext.lineTo(centerX + radius.x * Math.cos(counter),
                centerY + radius.y * Math.sin(counter));
        }
    }
    this.drawingContext.closePath();
    this.drawingContext.fillStyle = this.beadColor[color][shade];
    this.drawingContext.fill();
    this.drawingContext.strokeStyle =
        this.beadColor[color][Math.min(shade + 1, 3)];
    this.drawingContext.stroke();
},

drawRoundBeadPosition : function(p, color, special, reflection, start) {
    var shade = 1 + special;
    var radius;
    if (this.beadHeight > this.beadWidth) {
        radius = this.beadRadiusX;
    } else {
        radius = this.beadRadiusY;
    }
    radius = radius + (this.beadWidth >> 6) - 1;
    if (radius < 1) {
        return;
    }
    //radius = ((radius >> 1) << 1);
    var halfSpace;
    if (this.beadHeight === this.beadWidth) {
        this.drawingContext.beginPath();
        this.drawingContext.arc(start.x, start.y, radius, 0, Math.PI * 2, false);
        this.drawingContext.closePath();
        this.drawingContext.fillStyle = this.beadColor[color][shade];
        this.drawingContext.fill();
        this.drawingContext.strokeStyle =
            this.beadColor[color][Math.min(shade + 1, 3)];
        this.drawingContext.stroke();
    } else if (this.beadWidth > this.beadHeight) {
        halfSpace = (this.beadWidth - this.beadHeight) >> 1;
        // draw circles
        this.drawingContext.beginPath();
        if (this.vertical)
            this.drawingContext.arc(start.x, start.y - halfSpace, radius, 0, Math.PI * 2, false);
        else
            this.drawingContext.arc(start.x - halfSpace, start.y, radius, 0, Math.PI * 2, false);
        this.drawingContext.closePath();
        this.drawingContext.fillStyle = this.beadColor[color][shade];
        this.drawingContext.fill();
        this.drawingContext.strokeStyle =
            this.beadColor[color][Math.min(shade + 1, 3)];
        this.drawingContext.stroke();
        this.drawingContext.beginPath();
        if (this.vertical)
            this.drawingContext.arc(start.x, start.y + halfSpace, radius, 0, Math.PI * 2, false);
        else
            this.drawingContext.arc(start.x + halfSpace, start.y, radius, 0, Math.PI * 2, false);
        this.drawingContext.closePath();

        this.drawingContext.fillStyle = this.beadColor[color][shade];
        this.drawingContext.fill();
        this.drawingContext.strokeStyle =
            this.beadColor[color][Math.min(shade + 1, 3)];
        this.drawingContext.stroke();
        // draw middle
        this.drawingContext.beginPath();
        if (this.vertical)
            this.drawingContext.rect(start.x - (this.beadHeight >> 1),
                start.y - halfSpace + 1,
                2 * (this.beadHeight >> 1),
                2 * halfSpace - 2);
        else
            this.drawingContext.rect(start.x - halfSpace + 1,
                start.y - (this.beadHeight >> 1),
                2 * halfSpace - 2,
                2 * (this.beadHeight >> 1));
        this.drawingContext.closePath();
        this.drawingContext.fillStyle =
            this.beadColor[color][Math.min(shade + 1, 3)];
        this.drawingContext.fill();
        // some slight tweaks here
        this.drawingContext.beginPath();
        if (this.vertical)
            this.drawingContext.rect(start.x - (this.beadHeight >> 1) + 1,
                start.y - halfSpace - 1,
                2 * (this.beadHeight >> 1) - 2,
                2 * halfSpace);
        else
            this.drawingContext.rect(start.x - halfSpace,
                start.y - (this.beadHeight >> 1) + 1,
                2 * halfSpace - 1,
                2 * (this.beadHeight >> 1) - 2);
        this.drawingContext.closePath();
        this.drawingContext.fillStyle = this.beadColor[color][shade];
        this.drawingContext.fill();
        // erase internal arcs, needed all the time only if nearly round
        if (this.beadHeight * 3 > this.beadWidth * 2) {
            this.drawingContext.beginPath();
            this.drawingContext.arc(start.x, start.y, radius, 0, Math.PI * 2, false);
            this.drawingContext.closePath();
            this.drawingContext.fillStyle = this.beadColor[color][shade];
            this.drawingContext.fill();
        }
    } else if (this.beadHeight > this.beadWidth) {
        halfSpace = (this.beadHeight - this.beadWidth) >> 1;
        this.drawingContext.beginPath();
        if (this.vertical)
            this.drawingContext.arc(start.x - halfSpace, start.y, radius, 0, Math.PI * 2, false);
        else
            this.drawingContext.arc(start.x, start.y - halfSpace, radius, 0, Math.PI * 2, false);
        this.drawingContext.closePath();
        this.drawingContext.fillStyle = this.beadColor[color][shade];
        this.drawingContext.fill();
        this.drawingContext.strokeStyle =
            this.beadColor[color][Math.min(shade + 1, 3)];
        this.drawingContext.stroke();
        this.drawingContext.beginPath();
        if (this.vertical)
            this.drawingContext.arc(start.x + halfSpace, start.y, radius, 0, Math.PI * 2, false);
        else
            this.drawingContext.arc(start.x, start.y + halfSpace, radius, 0, Math.PI * 2, false);
        this.drawingContext.closePath();
        this.drawingContext.fillStyle = this.beadColor[color][shade];
        this.drawingContext.fill();
        this.drawingContext.strokeStyle =
            this.beadColor[color][Math.min(shade + 1, 3)];
        this.drawingContext.stroke();
        this.drawingContext.beginPath();
        if (this.vertical)
            this.drawingContext.rect(start.x - halfSpace,
                start.y - (this.beadWidth >> 1),
                2 * halfSpace,
                2 * (this.beadWidth >> 1));
        else
            this.drawingContext.rect(start.x - (this.beadHeight >> 1),
                start.y - halfSpace + 1,
                2 * (this.beadHeight >> 1),
                2 * halfSpace - 2);
        this.drawingContext.closePath();
        this.drawingContext.fillStyle =
            this.beadColor[color][Math.min(shade + 1, 3)];
        this.drawingContext.fill();
        // some slight tweaks here
        this.drawingContext.beginPath();
        if (this.vertical)
            this.drawingContext.rect(start.x - halfSpace,
                start.y - (this.beadHeight >> 1) + 1,
                2 * halfSpace - 1,
                2 * (this.beadHeight >> 1) - 2);
        else
            this.drawingContext.rect(start.x - (this.beadHeight >> 1) + 1,
                start.y - halfSpace - 1,
                2 * (this.beadHeight >> 1) - 2,
                2 * halfSpace);
        this.drawingContext.closePath();
        this.drawingContext.fillStyle = this.beadColor[color][shade];
        this.drawingContext.fill();
        // needed all the time only if nearly round
        if (this.beadWidth * 3 > this.beadHeight * 2) {
            this.drawingContext.beginPath();
            this.drawingContext.arc(start.x, start.y, radius, 0, Math.PI * 2, false);
            this.drawingContext.closePath();
            this.drawingContext.fillStyle = this.beadColor[color][shade];
            this.drawingContext.fill();
        }
    }
    if (!reflection)
        return;
    var newStart = new Coord(
        div((3 * this.beadWidth), 10) - this.beadRadiusX,
        div((3 * this.beadHeight), 10) - this.beadRadiusY);
    if (this.vertical) {
        var rotateStart = this.rotateInput(start);
        newStart.x = newStart.x + rotateStart.x;
        newStart.y = newStart.y + rotateStart.y;
        newStart = this.rotateOutput(newStart);
        newStart.x -= ((5 * this.beadGapX) >> 2); // fix for lighting
    } else {
        newStart.x += start.x;
        newStart.y += start.y;
    }
    if (radius >= 4) {
        this.drawingContext.beginPath();
        this.drawingContext.arc(newStart.x, newStart.y, radius >> 2,
            0, Math.PI * 2, false);
        this.drawingContext.closePath();
        this.drawingContext.fillStyle = this.beadColor[color][shade - 1];
        this.drawingContext.fill();
    }
},

drawRoundBead : function(p, color, special, offset, reflection) {
    //var start = new Coord();
    //this.setAbacusStart(p, start, offset);
    var start = new Coord(((this.rails - 1 - p.rail)
        * (this.beadWidth + this.beadGapX))
        + this.beadRadiusX + this.frameThickness + this.beadGapX,
        (((p.deck === 0) ? 1 : 0) * this.middleBarY)
        + (p.cell * this.beadHeight)
        + this.beadRadiusY + this.frameThickness + offset);
    if (this.vertical)
        start = this.rotateOutput(start);
    this.drawRoundBeadPosition(p, color, special, reflection, start);
},

drawEngravingPosition : function(p, start) {
    var decimalOffset = ((this.checkPiece()) ? 1 : 0);
    var centsOffset = ((this.centsSymbol === "") ? 0 : 2);
    this.drawingContext.font="10px Georgia";
    this.drawingContext.fillStyle = this.border;
    start.x -= 8;
    start.y += 2;
    var zeroes;
    if (p.rail - this.decimalPosition >= decimalOffset) {
        zeroes = "";
        for (i = 0; i < p.rail - this.decimalPosition - decimalOffset; i++)
            zeroes += "0";
        this.drawingContext.fillText(this.currencySymbol
            + ((p.deck === 1) ?
            this.deck[TOP].factor.toString() :
            this.deck[BOTTOM].factor.toString()) + zeroes,
            start.x - (zeroes.length - 1) * 3, start.y);
    } else if (p.rail < this.decimalPosition) {
        zeroes = "";
        if  (p.rail >= this.decimalPosition - centsOffset) {
            for (i = 0; i < p.rail - this.decimalPosition + centsOffset; i++)
                zeroes += "0";
            this.drawingContext.fillText(((p.deck === 1) ?
                this.deck[TOP].factor.toString() :
                this.deck[BOTTOM].factor.toString()) + zeroes + this.centsSymbol,
                start.x - (zeroes.length - 1) * 2, start.y);
        } else {
            zeroes += ".";
            for (i = 0; i < this.decimalPosition - p.rail - centsOffset - 1; i++)
                zeroes += "0";
            this.drawingContext.fillText(
                ((this.centsSymbol === "") ? this.currencySymbol : "")
                + zeroes + ((p.deck === 1) ?
                this.deck[TOP].factor.toString() :
                this.deck[BOTTOM].factor.toString()) + this.centsSymbol,
                start.x - (zeroes.length - 1 - ((this.centsSymbol === "") ? 0 : 1)) * 2, start.y);
        }
    } else if (p.rail - this.decimalPosition === 0) {
        zeroes = "";
        this.drawingContext.fillText(
            ((this.centsSymbol === "") ? this.currencySymbol : "")
            + zeroes + "25"
            + this.centsSymbol, start.x, start.y);
    }
},

drawBillPosition : function(p, start) {
    var currency = p.rail - this.decimalPosition + this.currencyOffset;
    if (currency >= 0 && currency < this.currencyRails &&
            this.images[p.deck][currency]) {
        try {
            if (this.vertical) {
                //this.images[p.deck][currency].rotate(90);
                //this.images[p.deck][currency].style.webkitTransform = "rotate(90deg)";
                //this.images[p.deck][currency].style.mozTransform = "rotate(90deg)";
                //this.images[p.deck][currency].style.oTransform = "rotate(90deg)";
                //this.images[p.deck][currency].style.msTransform = "rotate(90deg)";
                //this.images[p.deck][currency].style.transform = "rotate(90deg)";
                this.drawingContext.drawImage(this.images[p.deck][currency],
                    start.x - (this.beadHeight >> 1), start.y - (this.beadWidth >> 1),
                    this.beadHeight, this.beadWidth);
            } else {
                this.drawingContext.drawImage(this.images[p.deck][currency],
                    start.x - (this.beadWidth >> 1), start.y - (this.beadHeight >> 1),
                     this.beadWidth, this.beadHeight);
            }
            return;
        } catch(err) {
        }
    }
    var color = 3;
    var shade = 1;
    this.drawingContext.beginPath();
    if (this.vertical) {
        this.drawingContext.rect(start.x - (this.beadHeight >> 1),
            start.y - (this.beadWidth >> 1),
            this.beadHeight, this.beadWidth);
//        this.drawingContext.rotate(Math.PI / 2);
    } else {
        this.drawingContext.rect(start.x - (this.beadWidth >> 1),
            start.y - (this.beadHeight >> 1),
            this.beadWidth, this.beadHeight);
    }
    this.drawingContext.closePath();
    this.drawingContext.fillStyle = this.beadColor[color][shade];
    this.drawingContext.fill();
    this.drawingContext.strokeStyle =
    this.beadColor[color][Math.min(shade + 1, 3)];
    this.drawingContext.stroke();
    this.drawEngravingPosition(p, start);
},

drawCoinPosition : function(p, start) {
    var currency = p.rail - this.decimalPosition + this.currencyOffset;
    if (currency >= 0 && currency < this.currencyRails &&
            this.images[p.deck][currency]) {
        try {
            if (this.currency === "jp" && p.deck === 1 &&
                    (currency === 0 || currency === 1)) {
                this.drawRailHole(p);
            }
            if (this.vertical) {
                this.drawingContext.drawImage(this.images[p.deck][currency],
                    start.x - (this.beadHeight >> 1), start.y - (this.beadWidth >> 1),
                    this.beadHeight, this.beadWidth);
            } else {
                this.drawingContext.drawImage(this.images[p.deck][currency],
                    start.x - (this.beadWidth >> 1), start.y - (this.beadHeight >> 1),
                    this.beadWidth, this.beadHeight);
            }
            return;
        } catch(err) {
        }
    }
    this.drawEllipsePosition(p, 2, 0, start);
    this.drawEngravingPosition(p, start);
},

drawBill : function(p, offset) {
    var start = new Coord(((this.rails - 1 - p.rail)
        * (this.beadWidth + this.beadGapX))
        + this.beadRadiusX + this.frameThickness + this.beadGapX,
        (((p.deck === 0) ? 1 : 0) * this.middleBarY)
        + (p.cell * this.beadHeight)
        + this.beadRadiusY + this.frameThickness + offset);
    if (this.vertical)
        start = this.rotateOutput(start);
    this.drawBillPosition(p, start);
},

drawCoin : function(p, offset) {
    var start = new Coord(((this.rails - 1 - p.rail)
        * (this.beadWidth + this.beadGapX))
        + this.beadRadiusX + this.frameThickness + this.beadGapX,
        (((p.deck === 0) ? 1 : 0) * this.middleBarY)
        + (p.cell * this.beadHeight)
        + this.beadRadiusY + this.frameThickness + offset);
    if (this.vertical)
        start = this.rotateOutput(start);
    this.drawCoinPosition(p, start);
},

drawDiamondBead : function(p, color, special, offset) {
    var deckPosition = (p.deck === 0) ? 1 : 0;
    var shade = 1 + special;
    var start = new Coord(this.getRailPositionX(p.rail) - this.beadRadiusX,
        (deckPosition * this.middleBarY) + (p.cell * this.beadHeight)
        + this.frameThickness + offset);
    var coord0 = new Coord(start.x + this.beadRadiusX
        + ((this.railThickness - 1) >> 1) + 2, start.y + this.beadHeight);
    var coord1 = new Coord(start.x + this.beadRadiusX
        - (this.railThickness >> 1) - 2, start.y + this.beadHeight);
    var coord2 = new Coord(start.x - 1, start.y + this.beadRadiusY);
    var coord3 = new Coord(start.x + this.beadWidth,
        start.y + this.beadRadiusY);
    if (this.vertical) {
        coord0 = this.rotateOutput(coord0);
        coord1 = this.rotateOutput(coord1);
        coord2 = this.rotateOutput(coord2);
        coord3 = this.rotateOutput(coord3);
    }
    this.drawingContext.beginPath();
    this.drawingContext.moveTo(coord0.x, coord0.y);
    this.drawingContext.lineTo(coord1.x, coord1.y);
    this.drawingContext.lineTo(coord2.x, coord2.y);
    this.drawingContext.lineTo(coord3.x, coord3.y);
    this.drawingContext.closePath();
    if (this.vertical) { // fix for lighting
        this.drawingContext.fillStyle = this.beadColor[color][shade - 1];
    } else {
        this.drawingContext.fillStyle = this.beadColor[color][shade];
    }
    this.drawingContext.fill();
    coord0 = new Coord(start.x + this.beadRadiusX
        - (this.railThickness >> 1) - 2, start.y);
    coord1 = new Coord(start.x + this.beadRadiusX
        + ((this.railThickness - 1) >> 1) + 2, start.y);
    coord2 = new Coord(start.x + this.beadWidth, start.y + this.beadRadiusY);
    coord3 = new Coord(start.x - 1, start.y + this.beadRadiusY);
    if (this.vertical) {
        coord0 = this.rotateOutput(coord0);
        coord1 = this.rotateOutput(coord1);
        coord2 = this.rotateOutput(coord2);
        coord3 = this.rotateOutput(coord3);
    }
    this.drawingContext.beginPath();
    this.drawingContext.moveTo(coord0.x, coord0.y);
    this.drawingContext.lineTo(coord1.x, coord1.y);
    this.drawingContext.lineTo(coord2.x, coord2.y);
    this.drawingContext.lineTo(coord3.x, coord3.y);
    this.drawingContext.closePath();
    if (this.vertical) { // fix for lighting
        this.drawingContext.fillStyle = this.beadColor[color][shade];
    } else {
        this.drawingContext.fillStyle = this.beadColor[color][shade - 1];
    }
    this.drawingContext.fill();
},

drawCounters : function(p, count, selected, highlight) {
    var color = (highlight) ? 2 : 0;
    var special = 0;
    var shade = 1 + special;
    for (var i = 0; i < count; i++) {
        var start = new Coord(((this.rails - 1 - p.rail)
            * (this.beadWidth + this.beadGapX))
            - this.beadWidth * p.deck
            + this.beadWidth + this.frameThickness + this.beadGapX,
            this.middleBarThickness + this.middleBarY
            + ((this.deck[BOTTOM].cells * this.beadHeight) >> 1)
            + i * this.beadHeight - (count - 1) * (this.beadHeight >> 1));
        if (this.vertical)
            start = this.rotateOutput(start);
        if (this.currency !== "") {
            if (p.rail - this.decimalPosition -
                    ((this.checkPiece()) ? 1 : 0) >= this.billOffset) {
                this.drawBillPosition(p, start);
            } else {
                this.drawCoinPosition(p, start);
            }
        } else {
            var radius = (this.beadWidth >> 1) - div(this.beadWidth, 40);
            if (radius < 1) {
                return;
            }
            this.drawingContext.beginPath();
            this.drawingContext.arc(start.x, start.y, radius,
                0, Math.PI * 2, false);
            this.drawingContext.closePath();
            this.drawingContext.fillStyle = this.beadColor[color][shade];
            this.drawingContext.fill();
            this.drawingContext.strokeStyle =
                this.beadColor[color][Math.min(shade + 1, 3)];
        }
    }
},

drawBead : function(p, selected, highlight) {
    this.drawBeadMove(p, selected, highlight, 0);
},

drawBeadMove : function(p, selected, highlight, offset) {
    var color = 0;
    var special = 0;
    if (selected)
        special++;
    var beads = this.deck[p.deck].beads;
    if (p.rail === this.rails - 1 && this.checkSign()) {
        beads = ((p.deck === 0) ? 1 : 0);
        special++;
    }
    if (p.rail === this.decimalPosition - 1
            + ((this.checkPiece()) ? 1 : 0)
            + ((this.checkPiecePercent()) ? 1 : 0)
            + ((this.checkSubdeck()) ? 2 : 0) && this.checkPiece()) {
        beads = this.getPieces(p.deck);
        if (this.colorScheme === 0)
            special++;
    }
    if (p.rail === this.decimalPosition - 1 - this.shiftPercent
            + ((this.checkPiecePercent()) ? 1 : 0)
            && this.checkPiecePercent()) {
        beads = this.getPiecePercents(p.deck);
        if (this.colorScheme === 0)
            special++;
    }
    if (p.rail === this.decimalPosition + 1
            + ((this.checkPiecePercent()) ? 1 : 0) && this.checkSubdeck()) {
        if (this.getSubdeckFromPosition(p.cell) % 2 === 1)
            special++;
    }
    if ((this.colorScheme & COLOR_HALF) !== 0) {
        if ((beads & 1) !== 0) {
            if (p.index === (beads >> 1))
                color++;
        } else if (p.index >= (beads >> 1)) {
            if (this.deck[p.deck].orient)
                color++;
        } else {
            if (!this.deck[p.deck].orient)
                color++;
        }
    }
    if ((this.colorScheme & COLOR_MIDDLE) !== 0) {
        if ((((p.index === (beads >> 1) - 1) && ((beads & 1) === 0)) ||
                p.index === (beads >> 1)) && beads > 2)
            special++;
    }
    var anomalyPosition = 0;
    if (this.anomaly > 0 || this.anomalySq > 0) {
        if (this.anomalySq > 0) {
            anomalyPosition = this.anomalySq;
        } else {
            anomalyPosition = this.anomaly;
        }
    }
    var railOffset = p.rail - this.decimalPosition - anomalyPosition;
    if (railOffset >= 0 && (this.colorScheme & COLOR_GROUP) !== 0 &&
            !(this.checkSign() && p.rail === this.rails - 1) &&
            div(railOffset, this.groupSize) % 2 === 0) {
        color = (color + 1) % 2;
    }
    if ((this.colorScheme & COLOR_FIRST) !== 0 &&
            p.deck === 0 &&
            p.rail - this.decimalPosition - anomalyPosition
                - ((this.checkPiece()) ? 1 : 0)
                - ((this.checkPiecePercent()) ? 1 : 0)
                - ((this.checkSubdeck()) ? 2 : 0) > 0 &&
                (p.rail - this.decimalPosition - anomalyPosition
                - ((this.checkPiece()) ? 1 : 0)
                - ((this.checkPiecePercent()) ? 1 : 0)
                - ((this.checkSubdeck()) ? 2 : 0)) % this.groupSize === 0 &&
                !(this.checkSign() && p.rail === this.rails - 1)) {
        if (p.index === beads - 1 && this.deck[p.deck].orient)
            special++;
        else if (p.index === 0 && !this.deck[p.deck].orient)
            special++;
    }
    if (highlight)
        color = 2;
    if (this.currency !== "") {
        if (p.rail - this.decimalPosition -
                ((this.checkPiece()) ? 1 : 0) >= this.billOffset) {
            this.drawBill(p, offset);
        } else {
            this.drawCoin(p, offset);
        }
    } else if (this.diamond) {
        this.drawDiamondBead(p, color, special, offset);
    } else {
        this.drawRoundBead(p, color, special, offset, true);
    }
},

setAbacus : function(display, string) {
    var parts = string.split(".", 2);
    this.beadPosition = new Array(2);
    this.subbeadPosition = new Array(this.subdecks);
    for (var deck = 0; deck < this.decks; deck++) {
        this.beadPosition[deck] = new Array(this.rails);
        for (var rail = 0; rail < this.rails; rail++) {
            var beads = this.deck[deck].beads;
            var digit = 0;
            var digitPart = 0;
            if (rail === this.decimalPosition
                    + ((this.checkPiecePercent()) ? 1 : 0)
                    + ((this.checkSubdeck()) ? 2 : 0) && this.checkPiece()) {
                beads = this.getPieces(deck);
            } else if (rail === this.decimalPosition - this.shiftPercent
                    && this.checkPiecePercent()) {
                beads = this.getPiecePercents(deck);
            } else if (rail === this.decimalPosition + 1 &&
                    this.checkSubdeck()) {
                if (deck === 0) {
                    for (var subdeck = 0; subdeck < this.subdecks; subdeck++) {
                        this.subbeadPosition[subdeck] =
                            (this.deck[deck].orient) ?
                            this.getSubdeckBeads(subdeck) : 0;
                    }
                }
                continue;
            } else if (rail === this.decimalPosition &&
                    this.checkSubdeck()) {
                continue;
            } else if (rail === this.rails - 1 && this.checkSign()) {
                beads = (deck === 0) ? 1 : 0;
            } else if (this.deck[TOP].beads !== 0 || deck !== 1) {
                if (rail >= this.decimalPosition +
                        ((this.checkPiece()) ? 1 : 0) +
                        ((this.checkPiecePercent()) ? 1 : 0) +
                        ((this.checkSubdeck()) ? 2 : 0)) {
                    if (rail - this.decimalPosition -
                            ((this.checkPiece()) ? 1 : 0) -
                            ((this.checkPiecePercent()) ? 1 : 0) -
                            ((this.checkSubdeck()) ? 2 : 0)
                            < parts[0].length) {
                        digit = this.letterToDigit(
                            parts[0].charAt(parts[0].length - rail +
                            this.decimalPosition +
                            ((this.checkPiece()) ? 1 : 0) +
                            ((this.checkPiecePercent()) ? 1 : 0) +
                            ((this.checkSubdeck()) ? 2 : 0) - 1));
                    }
                } else {
                    if (parts.length > 1 &&
                            this.decimalPosition - rail - 1 < parts[1].length) {
                        var pos = this.decimalPosition - rail - 1;
                        digit = this.letterToDigit(parts[1].charAt(pos +
                            ((this.shiftPercent > pos &&
                            this.checkPiecePercent()) ? 1 : 0)));
                    }
                }
                var topFactor = this.deck[TOP].factor;
                var bottomNumber = this.deck[BOTTOM].beads;
                var diff = bottomNumber - topFactor;
                if (bottomNumber < this.base - 1 &&
                        this.base % topFactor != 0 && diff >= 0 &&
                        digit >= this.base - 1 - diff) {  // Cn16
                    var topNumber = div((this.base - 1), topFactor) - 1;
                    digitPart = (deck === 0) ? bottomNumber - diff :
                        topNumber;
                } else {
                    digitPart = (deck === 0) ? digit % topFactor :
                        div(digit, topFactor);
                }
            }
            this.beadPosition[deck][rail] = (this.deck[deck].orient) ?
                beads - digitPart : digitPart;
            // Cn16
        }
    }
    display.value = string; // TODO chop up and put back
    this.setSpan(display.value);
    this.drawAbacus();
},

/* This ignores strange characters */
simpleParser(buffer) {
    var numberCount = 0, decimalCount = 0;
    var digit = false, decimal = false, negate = false;
    var decimalPosition = this.decimalPosition;
    var character = '';

    // start over
    this.teachAString = '';
    this.teachBString = '';
    this.teachOp = ' ';
/*    if (this.deck[BOTTOM].pieces != 0)
        decimalPosition--;
    if (this.decimalPosition >= this.shiftPercent &&
            this.deck[BOTTOM].piecePercents != 0)
        decimalPosition--;*/
    for (var i = 0; i < buffer.length; i++) {
        character = buffer.charAt(i);
        if (character === 'q' || character == 'Q') {
            this.teachOp = character;
            return;
        }
        if ((character === '+' || character === '-') &&
                (numberCount === 0 || this.teachOp !== ' ') &&
                !digit) {
            if (character === '-')
                negate = !negate;
        } else if (character === '+' || character === '-' ||
                character === '*' || character === '/' ||
                character === 'v' || character === 'u') {
            if (this.teachOp != ' ')
                return;
            this.teachOp = character;
            numberCount++;
            decimalCount = 0;
            digit = false;
            decimal = false;
            negate = false;
        } else if (character === '.' && !decimal) {
            decimal = true;
            if (numberCount === 0)
                this.teachAString = this.teachAString.concat('.');
            else
                this.teachBString = this.teachBString.concat('.');
        } else if (isDigit(character)) {
            if (!decimal || decimalCount < decimalPosition) {
                if (numberCount === 0) {
                    if (!digit && negate)
                        this.teachAString = this.teachAString.concat('-');
                    this.teachAString = this.teachAString.concat(character);
                } else {
                    if (!digit && negate)
                        this.teachABtring = this.teachAString.concat('-');
                    this.teachBString = this.teachBString.concat(character);
                }
                negate = false;
            }
            if (decimal) {
                decimalCount++;
            }
            digit = true;
        }
    }
},

digitAddCn16 : function(a, b, carryIn, base, topFactor) {
    var sumLower, sumUpper;
    /* assumes that you are maximizing the top bar for 5 and A */
    var topNumber = div((base - 1), topFactor) - 1;
    var sum = a + b + carryIn;

    if ((sum % base) === base - 1) {
        if (a === base - 1) {
            this.teachLower = 0;
            this.teachUpper = 0;
        } else {
            sumLower = topFactor;
            this.teachLower = sumLower - a % topFactor;
            sumUpper = topNumber; 
            this.teachUpper = sumUpper - div(a, topFactor);
        }
    } else {
        if (a === base - 1) {
            sumLower = (sum - div(sum, base)) % topFactor;
            this.teachLower = sumLower - 1 - ((a - 1) % topFactor);
            sumUpper = div(sum - div(sum, base), topFactor) % (topNumber + 1);
            this.teachUpper = sumUpper - div((a - 1), topFactor);
        } else {
            sumLower = (sum - div(sum, base)) % topFactor;
            this.teachLower = sumLower - a % topFactor;
            sumUpper = div(sum - div(sum, base), topFactor) % (topNumber + 1);
            this.teachUpper = sumUpper - div(a, topFactor);
        }
    }
    this.teachCarry[this.teachState] = div(sum, base);
    if (DEBUG)
        log("addCn16:\t" + a + "\t" + b + "\t" +
            carryIn + "\t|\t" + this.teachLower + "\t" + this.teachUpper +
            "\t" + this.teachCarry[this.teachState]);

},

/* Idea taken from addition tables in "How to Learn Lee's Abacus", */
/* made a little more generic, to handle other bases. */
digitAdd : function(a, b, carryIn, base, topFactor, bottomNumber) {
    var newB = b + carryIn;
    var fractBase;
    var modB, modAns, ans;
    var modDivA, modDivAns, divAns;

    if (bottomNumber < base - 1 &&
            base % topFactor === 1 && bottomNumber >= topFactor) {
        this.digitAddCn16(a, b, carryIn, base, topFactor);
        return;
    }
    if (bottomNumber < base - 1) /* topFactor may not be set, Russian */
        fractBase = topFactor;
    else
        fractBase = base;
    // top factor must be divisible by base
    // breaks on Chinese abacus base 16
    modB = newB % fractBase;
    ans = a + newB;
    modAns = ans % fractBase;
    modDivA = div((a % base), fractBase);
    modDivAns = div((ans % base), fractBase);
    divAns = div(ans, base);
    if (modAns - modB >= 0)
        this.teachLower = modB;
    else
        this.teachLower = modB - fractBase;
    this.teachUpper = modDivAns - modDivA;
    this.teachCarry[this.teachState] = divAns;
    if (DEBUG)
        log("add:\t" + a + "\t" + b + "\t" +
            carryIn + "\t|\t" + this.teachLower + "\t" + this.teachUpper +
            "\t" + this.teachCarry[this.teachState]);
},

digitSubtractCn16 : function(a, b, carryIn, base, topFactor) {
    var sumLower, sumUpper;
    /* assumes that you are maximizing the top bar for 5 and A */
    var topNumber = div((base - 1), topFactor) - 1;
    var sum = a + base - b - carryIn;

    if ((sum % base) === base - 1) {
        if (a === base - 1) {
            this.teachLower = 0;
            this.teachUpper = 0;
        } else {
            sumLower = topFactor;
            this.teachLower = sumLower - a % topFactor;
            sumUpper = topNumber; 
            this.teachUpper = sumUpper - div(a, topFactor);
        }
    } else {
        if (a === base - 1) {
            sumLower = (sum - div(sum, base)) % topFactor;
            this.teachLower = sumLower - 1 - ((a - 1) % topFactor);
            sumUpper = div(sum - div(sum, base), topFactor) % (topNumber + 1);
            this.teachUpper = sumUpper - div((a - 1), topFactor);
        } else {
            sumLower = (sum - div(sum, base)) % topFactor;
            this.teachLower = sumLower - a % topFactor;
            sumUpper = div(sum - div(sum, base), topFactor) % (topNumber + 1);
            this.teachUpper = sumUpper - div(a, topFactor);
        }
    }
    this.teachCarry[this.teachState] = 1 - div(sum, base);
    if (DEBUG)
        log("subtractCn16:\t" + a + "\t" + b + "\t" +
            carryIn + "\t|\t" + this.teachLower + "\t" + this.teachUpper +
            "\t" + this.teachCarry[this.teachState]);
},

/* Idea taken from subtraction tables in "How to Learn Lee's Abacus, */
/* made a little more generic, to handle other bases. */
digitSubtract : function(a, b, carryIn, base, topFactor, bottomNumber) {
    var newB = b - carryIn;
    var fractBase;
    var modA, modB, ans;
    var divA, modDivAns, divAns;

    if (bottomNumber < base - 1 &&
            base % topFactor === 1 && bottomNumber >= topFactor) {
        this.digitSubtractCn16(a, b, carryIn, base, topFactor);
        return;
    }
    if (bottomNumber < base - 1) /* topFactor may not be set, Russian */
        fractBase = topFactor;
    else
        fractBase = base;
    // top factor must be divisible by base
    // breaks on Chinese abacus base 16
    modA = a % fractBase;
    modB = newB % fractBase;
    ans = a - newB;
    divA = div(a, fractBase);
    modDivAns = div(((ans + base) % base), fractBase);
    divAns = div((ans - base + 1), base);
    if (modA - modB >= 0)
        this.teachLower = -modB;
    else
        this.teachLower = fractBase - modB;
    this.teachUpper = modDivAns - divA;
    this.teachCarry[this.teachState] = divAns;
    if (DEBUG)
        log("sub:\t" + a + "\t" + b + "\t" +
            carryIn + "\t|\t" + this.teachLower + "\t" + this.teachUpper +
            "\t" + this.teachCarry[this.teachState]);
},

/* Move and turn off highlight */
moveToPosition : function(aux, position) {
    /*if (!((AbacusFrame) frame).getLee() && aux > 0) {
        return;
    }*/
    if (this.teachLower != 0)
        this.abacusMove(aux, 0, position, this.teachLower);
    if (this.teachUpper != 0)
        this.abacusMove(aux, 1, position, this.teachUpper);
    if (!TEST)
        this.highlightRail(aux, position, false);
},

/* Show final result */
finalAnswer : function(string, aux) {
    this.setText("Final answer: " + string, 2);
    if (!TEST)
        this.highlightRails(aux);
    this.teachStep = 0;
},

/* Tell about what is going to happen */
pendingUpdate : function(line, aux, position, base, bottomNumber) {
    var done;
    var buffer = "For rail" + " " + position;

    if (this.teachLower == 0 && this.teachUpper == 0 && this.teachCarry[this.teachState] == 0) {
        buffer = buffer.concat(" do nothing");
        this.teachStep++; /* or else two do nothings */
        done = true;
    } else {
        if (!TEST)
            this.highlightRail(aux, position, true);
        if (this.teachLower != 0) {
            if (this.teachLower < 0) {
                buffer = buffer.concat(", ");
                buffer = buffer.concat("take off");
                buffer = buffer.concat(" ");
                buffer = buffer.concat(-this.teachLower);
            } else {
                buffer = buffer.concat(", ");
                buffer = buffer.concat("put on");
                buffer = buffer.concat(" ");
                buffer = buffer.concat(this.teachLower);
            }
            if (bottomNumber <= (base >> 1)) {
                if (this.teachLower < 0) {
                    buffer = buffer.concat(" ");
                    buffer = buffer.concat("on lower deck");
                } else {
                    buffer = buffer.concat(" ");
                    buffer = buffer.concat("from lower deck");
                }
            }
        }
        if (this.teachUpper != 0) {
            if (this.teachUpper < 0) {
                buffer = buffer.concat(", ");
                buffer = buffer.concat("take off");
                buffer = buffer.concat(" ");
                buffer = buffer.concat(-this.teachUpper);
                buffer = buffer.concat(" ");
                buffer = buffer.concat("on upper deck");
            } else {
                buffer = buffer.concat(", ");
                buffer = buffer.concat("put on");
                buffer = buffer.concat(" ");
                buffer = buffer.concat(this.teachUpper);
                buffer = buffer.concat(" ");
                buffer = buffer.concat("from upper deck");
            }
        }
        if (this.teachCarry[this.teachState] != 0) {
            if (this.teachCarry[this.teachState] > 0) {
                buffer = buffer.concat(", ");
                buffer = buffer.concat("carry");
                buffer = buffer.concat(" ");
                buffer = buffer.concat(this.teachCarry[this.teachState]);
                buffer = buffer.concat(" (");
                buffer = buffer.concat("on next move");
                buffer = buffer.concat(")");
            } else {
                buffer = buffer.concat(", ");
                buffer = buffer.concat("borrow");
                buffer = buffer.concat(" ");
                buffer = buffer.concat(-this.teachCarry[this.teachState]);
                buffer = buffer.concat(" (");
                buffer = buffer.concat("on next move");
                buffer = buffer.concat(")");
            }
        }
        done = false;
    }
    buffer = buffer.concat(".");
    this.setText(buffer, line);
    return done;
},

decimalPlaceToRailPosition : function(aux, decimalPlace) {
    var shiftPercent;
    var piece, piecePercent, subdeck;
    var rail = decimalPlace;

    /*if (aux == 1 || aux == 2) {
        ab = ((AbacusFrame) frame).getAbacus(aux);
    } else {
        ab = abacus;
    }*/
    shiftPercent = this.shiftPercent;
    piece = this.checkPiece();
    piecePercent = this.checkPiecePercent();
    subdeck = this.checkSubdeck(3);

    /*if (subdeck) {
        if (rail < decimalPlace) {
            rail -= 3;
        }
    }*/
    if (!subdeck) {
        if (piece && (decimalPlace < 0))
            rail--;
        if (piecePercent && (decimalPlace < -shiftPercent))
            rail--;
    }
    if (DEBUG) {
        log("decimalPositionToRailPosition: rail = "
            + rail + ", decimalPlace = " + decimalPlace);
    }
    return rail;
},

/* Handle addition and subtraction one step at a time */
nextPositionSum : function(operation) {
    var n = ((this.teachStep - 2) >> 1); /* 2 step display */
    var max = addSteps(this.teachAString); /* number of steps with original */
    var topFactor = this.deck[TOP].factor;
    var bottomNumber = this.deck[BOTTOM].beads;
    var rightToLeft = this.rightToLeftAdd;
    var rPos, bPos, place, rDigit;

    /* this.teachRString can expand with carries. */
    /* this.teachBString does not change, so bPos will be predictable. */
    bPos = nextCharPosition(n, this.teachCarryStep,
            rightToLeft, this.teachBString);
    place = decimalPlaceString(this.teachBString, bPos);
    rPos = decimalOffsetString(this.teachRString, place);
    rDigit = nextChar(this.teachRString, rPos);
    if (this.teachCarryStep === 0)
        this.teachBDigit = nextChar(this.teachBString, bPos);
    else
        this.teachBDigit = 1;
    if (!rightToLeft)
        this.teachCarry[this.teachState] = 0;
    if (operation === '+') {
        this.digitAdd(rDigit, this.teachBDigit, this.teachCarry[this.teachState],
            this.base, topFactor, bottomNumber);
    } else /* operation == '-' */
        this.digitSubtract(rDigit, this.teachBDigit, this.teachCarry[this.teachState],
            this.base, topFactor, bottomNumber);
    this.teachDPosition = place;
    this.teachADigit = rDigit;
    return (n >= max - 1);
},

convertStringToAbacus : function(string, aux, decimalPoint) {
    var decimal = 0;
    var digit, factor, sign = 0, len = string.length;
    var topFactor = this.deck[TOP].factor;
    var bottomFactor = this.deck[BOTTOM].factor;
    var bottomNumber = this.deck[BOTTOM].beads;
    var diff = bottomNumber - topFactor;

    if (DEBUG) {
        var prefix;
        switch (aux) {
        case 1:
            prefix = "Left Auxiliary> ";
            break;
        case 2:
            prefix = "Right Auxiliary> ";
            break;
        default:
            prefix = "Primary> ";
        }
        log("convertStringToAbacus: " + prefix + string);
    }
    this.clearAbacus(this.display); // clearRails
    while (decimal < string.length &&
            string.charAt(decimal) != decimalPoint)
        decimal++;
    if (string.charAt(0) === '-' || string.charAt(0) === '+') {
        sign = 1;
    }
    for (var i = 0; i < decimal - sign; i++) {
        /* this.display.base == this.base and all that ... */
        digit = char2Int(string.charAt(decimal - 1 - i));
        if (bottomNumber < this.base - 1 &&
                this.base % topFactor == 1 && diff >= 0 &&
                digit >= this.base - 1 - diff) {  // Cn16
            var topNumber = div((this.base - 1), topFactor) - 1;
            this.abacusMove(aux, 1, i, topNumber);
            this.abacusMove(aux, 0, i, bottomNumber - diff);
        } else {
            if (bottomNumber < this.base - 1) {
                // fix for aux
                factor = div(digit, topFactor);
                if (factor > 0) {
                     this.abacusMove(aux, 1, i, factor);
                     digit = digit - factor * topFactor;
                }
            }
            factor = div(digit, bottomFactor);
            if (factor > 0) {
                 this.abacusMove(aux, 0, i, factor);
            }
        }
    }
    if (this.sign && string.charAt(0) === '-') {
        this.abacusMove(aux, 0,
            this.rails - this.decimalPosition() - 1, 1);
    }
    for (i = 0; i < len - decimal - 1 &&
            i < this.decimalPosition; i++) {
        var offset = 0;
	var j;
        digit = char2Int(string.charAt(decimal + i + 1));
        if (this.deck[BOTTOM].pieces != 0)
            offset++;
        if (this.deck[BOTTOM].piecePercents != 0 &&
                i >= this.shiftPercent)
            offset++;
	j = -i - 1 - offset;
        if (bottomNumber < this.base - 1 &&
                this.base % topFactor == 1 && diff >= 0 &&
                digit >= this.base - 1 - diff) {  // Cn16
            var topNumber = div((this.base - 1), topFactor) - 1;
            this.abacusMove(aux, 1, j, topNumber);
            this.abacusMove(aux, 0, j, bottomNumber - diff);
        } else {
            if (bottomNumber < this.base - 1) {
                factor = div(digit, topFactor);
                if (factor > 0) {
                    this.abacusMove(aux, 1, j, factor);
                    digit = digit - factor * topFactor;
                }
            }
            factor = div(digit, bottomFactor);
            if (factor > 0) {
                this.abacusMove(aux, 0, j, factor);
            }
        }
    }
},

/* Set string given change in rail (decimal position) */
setString : function(string, aux, place, lower, upper) {
    var offset, digit;
    var topFactor = this.deck[TOP].factor; // no aux
    var bottomNumber = this.deck[BOTTOM].beads; // no aux
    var newChar;

    if (bottomNumber <= (this.base >> 1))
        digit = lower + upper * topFactor;
    else
        digit = lower;
    string = expandString(string, place);
    offset = decimalOffsetString(string, place);
    newChar = digitToChar((digit + this.base +
        charToDigit(string.charAt(offset))) % this.base);
    string = string.substring(0, offset) + newChar +
        string.substring(offset + 1);
    return string;
},

/* Appends 0's where necessary to make adding easier
/* (before and after decimal point) */
addSafe: function() {
    var aDecimal = getDecimalStringPosition(this.teachAString);
    var bDecimal = getDecimalStringPosition(this.teachBString);
    var aCount = this.teachAString.length - aDecimal;
    var bCount = this.teachBString.length - bDecimal;
    var i;

    if (aCount > bCount) {
        for (i = 0; i < aCount - bCount; i++)
            this.teachBString = this.teachBString.concat('0');
    } else {
        for (i = 0; i < bCount - aCount; i++)
            this.teachAString = this.teachAString.concat('0');
    }
    if (aDecimal > bDecimal) {
        for (i = 0; i < aDecimal - bDecimal; i++)
            this.teachBString = "0".concat(this.teachBString); /* prepend */
    } else {
        for (i = 0; i < bDecimal - aDecimal; i++)
            this.teachAString = "0".concat(this.teachAString); /* prepend */
    }
},

teachStepAbacus : function(buffer) {
    //var teachString0 = "Enter calculation X+Y, X-Y, X*Y, X/Y, Xv, or Xu where X and result nonnegative.";
    var teachString0 = "Enter calculation X+Y or X-Y where X and result nonnegative.";
    var teachString1 = "Press enter to go through calculation steps.";
    var buffer1;
    var base = this.base;
    var bottomNumber = this.deck[BOTTOM].beads;
    var a, b; // formerly BigDecimal
    var newAux = 0; // aux
    var done = false;

    /*if (TEST) {
        if (newAux == 0) {
            //testTeachRoot(abacus, 0, 10102, 10000);
            testTeachRoot(abacus, 0, 1002, 10000);
        } else {
            newAux = 0;
        }
    }*/
    if (this.teachStep == 0) {
        /*testTable();*/
        this.setText(teachString0, 0);
        this.setText("", 1);
        this.setText("", 2);
        this.teachReg = -1;
        this.regCount = 0;
        this.teachCarryStep = 0;
        this.teachCarry[0] = 0;
        this.teachCarry[1] = 0;
        if (buffer.length === 0)
            return;
        this.setText(teachString1, 1);
        this.teachStep++;
    } else if (this.teachStep == 1) {
        this.simpleParser(buffer);
        if (DEBUG)
            log("buffer = " + this.teachAString
                + " " +  this.teachOp
                + " " +  this.teachBString);
        if (this.teachOp == 'q' || this.teachOp == 'Q') {
            this.teachStep = 0;
            this.popUp.close();
            return;
        }
        if (this.anomaly != 0) {
            this.addBackAnomaly(this.teachAString,
                this.anomaly,
                this.shiftAnomaly,
                base, '.', this.decimalPosition);
        }
        if (this.anomalySq != 0) {
            this.addBackAnomaly(this.teachAString,
                this.anomalySq,
                this.shiftAnomaly + this.shiftAnomalySq,
                base, '.', this.decimalPosition);
        }
        /*if (this.checkSubdeck()) {
            this.teachAString = zeroFractionalPart(this.teachAString);
            this.teachBString = zeroFractionalPart(this.teachBString);
        }*/
        this.teachAString = contractString(this.teachAString);
        this.teachBstring = contractString(this.teachBString);
        /*testShift(this.teachAString);*/
        switch (this.teachOp) {
        case '+':
        case '-':
            this.convertStringToAbacus(this.teachAString, newAux, '.');
            /*if ((this.lee) {
                this.convertStringToAbacus("0.0", 1);
                this.convertStringToAbacus("0.0", 2);
            }*/
            a = convertToDecimal(base, this.teachAString, '.', this.decimalPosition);
            b = convertToDecimal(base, this.teachBString, '.', this.decimalPosition);
            if (this.teachOp == '-' && b > a) {
                /* Revisit this, it should be allowed, but
                  rails probably need to be respected.
                  Goes along with complement feature. */
                this.setText("Subtraction underflow " +
                    this.teachAString + this.teachOp + this.teachBString, 0);
                this.teachStep = 0;
                return;
            }
            buffer1 = ((this.teachOp == '+') ?
                "Adding" : "Subtracting") +
                " " + this.teachAString + " " + this.teachOp +
                " " + this.teachBString;
            this.setText(buffer1, 0);
            this.teachAString = decimalSafe(this.teachAString);
            this.teachBString = decimalSafe(this.teachBString);
            this.addSafe();
            this.teachRString = this.teachAString;
            this.setText("Current answer" + ": " + this.teachRString, 1);
            this.teachStep++;
            break;
        case '*':
        case '/':
        case 'v':
        case 'u':
            this.setText("TBD", 3);
        }
        if (DEBUG)
            log("op buffer = " + this.teachAString +
                " " + this.teachOp + " " + this.teachBString + " " +
                this.rightToLeftAdd + " " +
                this.rightToLeftMult);
        this.teachCarry[0] = 0;
        this.teachCarry[1] = 0;
    } else if (this.teachOp === 'v' || this.teachOp === 'u') {
        teachStepRoot(abacus);
    } else if (this.teachReg == 0 || (this.teachReg < 0 && ((this.teachCarryStep != 0 &&
            this.teachCarryStep % 2 == 0 && this.teachCarryStep >= 2) ||
            (this.teachCarryStep == 0 && this.teachStep % 2 == 0 &&
            this.teachStep >= 2)))) {
        /* Tell user what is going to happen */
        this.teachState = 0;
        switch (this.teachOp) {
        case '+':
        case '-':
            done = this.nextPositionSum(this.teachOp);
            buffer1 = ((this.teachOp == '+') ?
                "Adding" : "Subtracting") +
                " " + this.teachAString + " " + this.teachOp +
                " " + this.teachBString;
            if (this.teachCarryStep === 0) {
                var buf = convertFromDecimal(this.base,
                    this.teachADigit, false, this.decimalPosition);
                buf = trimString(buf);
                buffer1 = buffer1.concat(" ... ");
                buffer1 = buffer1.concat(buf);
                buf = convertFromDecimal(this.base,
                    this.teachBDigit, false, this.decimalPosition);
                buf = trimString(buf);
                buffer1 = buffer1.concat(" ");
                buffer1 = buffer1.concat(this.teachOp);
                buffer1 = buffer1.concat(" ");
                buffer1 = buffer1.concat(buf);
                if (this.teachOp == '+')
                    buf= convertFromDecimal(this.base,
                        (this.teachADigit + this.teachBDigit),
                        false, this.decimalPosition);
                else
                    buf = convertFromDecimal(this.base,
                        (this.teachADigit - this.teachBDigit),
                        false, this.decimalPosition);
                buf = trimString(buf);
                buffer1 = buffer1.concat(" = ");
                buffer1 = buffer1.concat(buf);
            } else {
                buffer1 = buffer1.concat(" ... ");
                buffer1 = buffer1.concat("carrying");
                buffer1 = buffer1.concat(" ");
                buffer1 = buffer1.concat(1);
            }
            this.setText(buffer1, 0);
            break;
        case '*':
        case '/':
        case 'v':
        case 'u':
        }
        if (!this.pendingUpdate(1, 0,
                this.decimalPlaceToRailPosition(0, this.teachDPosition),
                base, bottomNumber))
            done = false;
        if (this.teachCarry[this.teachState] == 0 && this.teachCarryStep == 0 && done) {
            contractString(this.teachRString);
            switch (this.teachOp) {
            case 'v':
            case 'u':
                contractString(this.teachSString);
                this.finalAnswer(this.teachSString, 1);
                break;
            case '/':
                contractString(this.teachSString);
                this.finalAnswer(this.teachSString, 2);
                break;
            default:
                this.finalAnswer(this.teachRString, 0);
            }
        } else if (this.teachCarryStep == 0) {
            this.teachStep++;
        } else {
            this.teachCarryStep++;
        }
    } else {
        /* Actually carry out what was told would happen */
        var rPosition = 0;
 
        if (!this.rightToLeftAdd)
            this.teachCarry[1] = this.teachCarry[0];
        this.teachState = 1; 
        switch (this.teachOp) {
        case '+':
        case '-':
            done = this.nextPositionSum(this.teachOp);
            rPosition = this.decimalPlaceToRailPosition(0, this.teachDPosition);
            this.teachRString = this.setString(this.teachRString, 0,
                 this.teachDPosition, this.teachLower, this.teachUpper);
            break;
        case '*':
        case '/':
        case 'v':
        case 'u':
            this.setText("TBD", 3);
        }
        this.moveToPosition( 0, rPosition);
        /*if (this.teachCarry[this.teachState] != 0) {
            this.teachCarry[this.teachState] = 0;
            this.abacusMove(0, 0, rPosition + 1, this.teachCarry[this.teachState]);
        }*/
        if (this.teachCarry[this.teachState] == 0 && this.teachCarryStep != 0) {
            this.teachCarryStep = 0;
        }
        this.teachRString = contractString(this.teachRString);
        if (this.teachCarry[this.teachState] == 0 && this.teachCarryStep == 0 && done) {
            switch (this.teachOp) {
            case 'v':
            case 'u':
                this.teachSString = contractString(this.teachSString);
                this.finalAnswer(this.teachSString, 1);
                break;
            case '/':
                this.teachSString = contractString(this.teachSString);
                this.finalAnswer(this.teachSString, 2);
                break;
            default:
                this.finalAnswer(this.teachRString, 0);
            }
        } else {
            if (this.teachOp == '/' || this.teachOp == 'v' || this.teachOp == 'u') {
                this.teachSString = contractString(this.teachSString);
                this.setText("Current answer" + ": " + this.teachSString, 2);
            } else {
                this.setText("Current answer" + ": " + this.teachRString, 2);
            }
            if ((done && this.rightToLeftAdd) ||
                    !this.rightToLeftAdd) {
                if (this.teachCarry[this.teachState] != 0) {
                    if (this.teachCarryStep == 0) {
                        this.teachCarryStep = 2;
                        if (this.rightToLeftAdd)
                            this.teachCarry[1] = this.teachCarry[0] = 0;
                    } else {
                        this.teachCarryStep++;
                    }
                }
                if (this.teachCarryStep == 0) {
                    this.teachStep++;
                }
            } else if (this.rightToLeftAdd) {
                this.teachStep++;
            }
        }
    }
},

teachAbacus : function(display) {
    if (!teachMode(this.popUp)) {
        this.popUp = window.open("", "Teach", "width=669,height=103,alwaysRaised=yes");
        this.popUp.document.title = "Teach";
        var teachElement = this.popUp.document.createElement("input");
        //this.teachElement.id = "teach";
        this.popUp.document.body.appendChild(teachElement);
        teachElement.addEventListener("keydown", function(e) {
            if (!e) {
                e = window.event;
            }
            //e.preventDefault(); // sometimes useful
            // Enter is pressed
            if (e.keyCode == 13) {
                submitTeach(this.value);
            }
        }, false);
        this.popUp.document.body.appendChild(
            this.popUp.document.createElement("br"));
        var span0Element = this.popUp.document.createElement("span");
        span0Element.id = "text0";
        this.popUp.document.body.appendChild(span0Element);
        this.popUp.document.body.appendChild(
            this.popUp.document.createElement("br"));
        var span1Element = this.popUp.document.createElement("span");
        span1Element.id = "text1";
        this.popUp.document.body.appendChild(span1Element);
        this.popUp.document.body.appendChild(
            this.popUp.document.createElement("br"));
        var span2Element = this.popUp.document.createElement("span");
        span2Element.id = "text2";
        this.popUp.document.body.appendChild(span2Element);
        //spanElement.setAttribute("style", "background-color: #aeb2c3; border:1px solid tan; margin:1");
        //https://stackoverflow.com/questions/40471414/draw-video-in-canvas-on-another-window
        // https://stackoverflow.com/questions/8894226/javascript-submit-textbox-on-enter
        this.teachStepAbacus("");
        this.teachStep = 0;
    }
},

clearAbacus : function(display) {
    this.beadPosition = new Array(2);
    this.subbeadPosition = new Array(this.subdecks);
    for (var deck = 0; deck < this.decks; deck++) {
        this.beadPosition[deck] = new Array(this.rails);
        for (var rail = 0; rail < this.rails; rail++) {
            var beads = this.deck[deck].beads;
            if (rail === this.rails - 1 && this.checkSign()) {
                beads = (deck === 0) ? 1 : 0;
            }
            if (rail === this.decimalPosition
                   + ((this.checkPiecePercent()) ? 1 : 0)
                   + ((this.checkSubdeck()) ? 2 : 0) && this.checkPiece()) {
                beads = this.getPieces(deck);
            }
            if (rail === this.decimalPosition - this.shiftPercent
                    && this.checkPiecePercent()) {
                beads = this.getPiecePercents(deck);
            }
            if (rail === this.decimalPosition + 1 && this.checkSubdeck()) {
                if (deck === 0) {
                    for (var subdeck = 0; subdeck < this.subdecks; subdeck++) {
                        if (this.deck[deck].orient) {
                            this.subbeadPosition[subdeck] =
                                this.getSubdeckBeads(subdeck);
                        } else {
                            this.subbeadPosition[subdeck] = 0;
                        }
                    }
                }
                continue;
            }
            this.beadPosition[deck][rail] =
                (this.deck[deck].orient) ? beads : 0;
        }
    }
    display.value = "0";
    this.undo = new Array();
    this.redo = new Array();
    this.setSpan(display.value);
    this.drawAbacus();
},

complementAbacus : function(display) {
    var rail, deck;
    for (rail = 0; rail < this.rails; rail++) {
        for (deck = BOTTOM; deck <= TOP; deck++) {
            if ((this.checkSign() && (rail === this.rails - 1)) ||
                    (this.checkPiece() &&
                    (rail === this.decimalPosition +
                    (this.checkPiecePercent() ?  1 : 0) +
                    (this.checkSubdeck() ? + 2 : 0))) ||
                    (this.checkPiecePercent() &&
                    (rail === this.decimalPosition -
                    this.shiftPercent)) ||
                    (this.checkSubdeck() && (rail ===
                    this.decimalPosition - 2))) {
                continue;
            }
            {
                var beads = this.deck[deck].beads;
                if (rail === this.rails - 1 && this.checkSign()) {
                    beads = (deck === 0) ? 1 : 0;
                }
                if (rail === this.decimalPosition
                        + ((this.checkPiecePercent()) ? 1 : 0)
                        + ((this.checkSubdeck()) ? 2 : 0) && this.checkPiece()) {
                     beads = this.getPieces(deck);
                }
                if (rail === this.decimalPosition - this.shiftPercent
                        && this.checkPiecePercent()) {
                    beads = this.getPiecePercents(deck);
                }
                var bead = this.beadPosition[deck][rail];
                var maxFactor;
                if (this.deck[deck].orient) {
                        bead = beads - bead;
                }
                // prime bases
                if (deck === TOP &&
                        this.deck[BOTTOM].beads >= this.base - 1) {
                    continue;
                }
                maxFactor = (deck === BOTTOM) ?
                        this.deck[TOP].factor :
                        div(this.base, this.deck[TOP].factor);
                // not really well defined, so ignore
                var offset = 0;
                if (this.base === this.deck[TOP].factor * this.deck[TOP].beads +
                        this.deck[BOTTOM].beads + 1 && deck === BOTTOM &&
                        this.base % this.deck[TOP].factor != 0) {
                    offset = 1;
                }
                if (bead >= maxFactor + offset)
                    continue;
                var value = maxFactor - 1 + offset - 2 * bead;
                this.moveBeadsByValue(deck, rail, value);
            }
        }
    }
    this.undo = new Array();
    this.redo = new Array();
    this.drawAbacus();
},

partOffset : function(aux, rail) {
    var newRail = rail + this.decimalPosition;
   if (this.deck[BOTTOM].piecePercents != 0) {
        if (DEBUG)
            log("partOffset piecePecents:" + this.deck[BOTTOM].piecePercents);
        newRail++;
    }
    if (this.deck[BOTTOM].pieces != 0) {
        if (DEBUG)
            log("partOffset pieces: " + this.deck[BOTTOM].pieces);
        //if (rail < this.decimalPosition)
        newRail++;
    }
    if (this.checkSubdeck()) {
        if (DEBUG)
            log("partOffset: " + this.checkSubdeck());
        //if (rail >= -this.decimalPosition)
        if (rail >= this.decimalPosition - 2)
           newRail += 2;
    }
    return newRail;
},

abacusMove : function(aux, deck, rail, value) {
    if (DEBUG)
        log(//"aux=" + aux +
            "decimalPosition=" + this.decimalPosition +
            ", deck=" + deck +
            ", rail=" + rail +
            ", value=" + value);
    var newRail = this.partOffset(aux, rail);
    if (DEBUG)
        log("aux=" + aux +
            ", deck=" + deck +
            ", newRail=" + newRail +
            ", value=" + value);
    this.moveBeadsByValue(deck, newRail, value); // ignore aux
},

moveBeadsByValue : function(deck, rail, value) {
     var beadInfo = new Bead(deck, rail, value, -1);
     var bead = this.beadPosition[deck][rail];
     var orient = this.deck[deck].orient;
     var spaces = this.findSpaces(beadInfo);
     var cell;

     if (spaces === 0)
        return;
     if (this.medieval) {
         cell = value;
     } else {
         if (orient) {
             if (value < 0)
                 cell = bead - value + spaces - 1;
             else if (value > 0)
                 cell = bead - value;
             else
                 return;
         } else {
             if (value < 0)
                 cell = bead + value;
             else if (value > 0)
                 cell = bead + value + spaces - 1;
             else
                 return;
         }
     }
     this.pressedBead = new Bead(deck, rail, cell, -1);
     this.place(this.pressedBead, false, false);
},

undoAbacus : function(display) {
    if (this.undo.length === 0)
        return;
    var move = this.undo.pop();
    this.redo.push(new Move(move.aux, move.deck, move.rail, move.number));
    this.moveBeadsByValue(move.deck, move.rail, -move.number);
    this.drawAbacus();
},

redoAbacus : function(display) {
    if (this.redo.length === 0)
        return;
    var move = this.redo.pop();
    this.undo.push(new Move(move.aux, move.deck, move.rail, move.number));
    this.moveBeadsByValue(move.deck, move.rail, move.number);
    this.drawAbacus();
},

decrementAbacus : function(display, spinner) {
    var valueString = this.getSpan();
    if (this.rails > 1) {
        this.rails--;
        if (display.railsElement !== null) {
            display.railsElement.value = this.rails;
        }
        //railsChange(this.rails);
    }
    if (this.decimalPosition >= this.rails
            - ((this.checkPiece()) ? 1 : 0)
            - ((this.checkPiecePercent()) ? 1 : 0)) {
        this.decimalPosition = this.rails - 1
            - ((this.checkPiece()) ? 1 : 0)
            - ((this.checkPiecePercent()) ? 1 : 0);
    }
    this.setFrame();
    this.setSize();
    this.clearAbacus(display);
    var string;
    if (this.base !== this.display.base || this.anomaly !== 0) {
        string = "0";
    } else {
        string = this.trimForAbacus(valueString);
    }
    if (string !== valueString) {
        this.setSpan(string);
    }
    this.setAbacus(display, string);
    this.setStyleDisplay(display);
},

incrementAbacus : function(display) {
    var valueString = this.getSpan();
    this.rails++;
    if (display.railsElement !== null) {
        display.railsElement.value = this.rails;
    }
    //railsChange(this.rails);
    this.setFrame();
    this.setSize();
    this.clearAbacus(display);
    var string;
    if (this.base !== this.display.base || this.anomaly !== 0) {
        string = "0";
    } else {
        string = this.trimForAbacus(valueString);
    }
    if (string !== valueString) {
        this.setSpan(string);
    }
    this.setAbacus(display, string);
    this.setStyleDisplay(display);
},

railsAbacus : function(display) {
    if (display.railsElement === null) {
        return;
    }
    var valueString = this.getSpan();
    var value = Number(display.railsElement.value);
    if (value !== this.rails) {
        if (value < 1) {
            display.railsElement.value = this.rails;
            return;
        }
        this.rails = parseInt(value);
        if (this.decimalPosition >= this.rails
                - ((this.checkPiece()) ? 1 : 0)
                - ((this.checkPiecePercent()) ? 1 : 0)) {
            this.decimalPosition = this.rails - 1
                - ((this.checkPiece()) ? 1 : 0)
                - ((this.checkPiecePercent()) ? 1 : 0);
         }
         this.setFrame();
         this.setSize();
    }
    this.clearAbacus(display);
    var string;
    if (this.base !== this.display.base || this.anomaly !== 0) {
        string = "0";
    } else {
        string = this.trimForAbacus(valueString);
    }
    if (string !== valueString) {
        this.setSpan(string);
    }
    this.setAbacus(display, string);
    this.setStyleDisplay(display);
},

updateWidgets : function(display) {
    // TODO figure out a way to modify auxiliary
    if (display.railsElement !== null) {
        display.railsElement.value = this.rails;
    }
    /*if (display.auxiliary0Element !== null) {
        display.auxliliary0Element.value = this.auxiliary0Rails;
    }
    if (display.auxiliary1Element !== null) {
        display.auxliliary1Element.value = this.auxiliary1Rails;
    }*/
},

fullScreenAbacus : function(element) {
    /*if (document.fullscreenEnabled || document.mozFullScreenEnabled || document.webkitFullscreenEnabled) {
       if (document.exitFullscreen()) {
           document.exitFullscreen();
       } else if (document.mozCancelFullScreen()) {
           document.mozCancelFullScreen();
       } else if (document.webkitExitFullScreen()) {
           document.webkitExitFullScreen();
       }
       return;
    }*/
    // Supports most browsers and their versions.
    var requestMethod = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullScreen;

    if (requestMethod) { // Native full screen.
        requestMethod.call(element);
    } else if (typeof window.ActiveXObject !== "undefined") { // Older IE.
        var wscript = new ActiveXObject("WScript.Shell");
        if (wscript != null) {
            wscript.SendKeys("{F11}");
        }
    }
},

setStyleDisplay : function(display) {
    var style = "border: ridge 2px #99aabb; padding: 0; width: "
        + (this.abacusCanvasElement.width - 4)
        + "px; margin: 0; text-align: right; "
        + "line-height: 23px; color: " + this.border;
    document.getElementById(display.spanElement.id).setAttribute("style", style);
},

getSpan : function() {
    if ("textContent" in this.display.spanElement) {
        return this.display.spanElement.textContent;
    }
    return this.display.spanElement.innerText;
    //return this.display.spanElement.innerHTML;
},

setSpan : function(string) {
    if (this.group) {
        string = numberWithCommas(string, this.groupSize);
    }
    if (this.decimalComma) { // swap
        string = string.replace(/\./g, "@").replace(/,/g, ".").replace(/@/g, ",");
    }
    if ("textContent" in this.display.spanElement) {
        this.display.spanElement.textContent = string;
    } else {
        this.display.spanElement.innerText = string;
    }
    //this.display.spanElement.innerHTML = string;
},

setText : function(string, number) {
    this.popUp.document.getElementById("text" + number).textContent = string;
},

setSize : function() {
    if (this.vertical) {
        this.abacusCanvasElement.width = this.frameSize.y;
        this.abacusCanvasElement.height = this.frameSize.x;
    } else {
        this.abacusCanvasElement.width = this.frameSize.x;
        this.abacusCanvasElement.height = this.frameSize.y;
    }
}
  };
 }
}

var primary = null;
var auxiliary0 = null;
var auxiliary1 = null;

function auxiliary0OnKeyPress(event) {
    auxiliary0.onKeyPress(event);
}

function auxiliary1OnKeyPress(event) {
    auxiliary1.onKeyPress(event);
}

function primaryOnKeyPress(event) {
    primary.onKeyPress(event);
}

function auxiliary0OnMouseDown(event) {
    auxiliary0.onMouseDown(event);
}

function auxiliary1OnMouseDown(event) {
    auxiliary1.onMouseDown(event);
}

function primaryOnMouseDown(event) {
    primary.onMouseDown(event);
}

function auxiliary0OnTouchStart(event) {
    auxiliary0.onTouchStart(event);
}

function auxiliary1OnTouchStart(event) {
    auxiliary1.onTouchStart(event);
}

function primaryOnTouchStart(event) {
    primary.onTouchStart(event);
}

function auxiliary0OnMouseUp(event) {
    auxiliary0.onMouseUp(event);
}

function auxiliary1OnMouseUp(event) {
    auxiliary1.onMouseUp(event);
}

function primaryOnMouseUp(event) {
    primary.onMouseUp(event);
}

function auxiliary0OnTouchStop(event) {
    auxiliary0.onTouchStop(event);
}

function auxiliary1OnTouchStop(event) {
    auxiliary1.onTouchStop(event);
}

function primaryOnTouchStop(event) {
    primary.onTouchStop(event);
}

function auxiliary0OnMouseOut(event) {
    auxiliary0.onMouseOut(event);
}

function auxiliary1OnMouseOut(event) {
    auxiliary1.onMouseOut(event);
}

function primaryOnMouseOut(event) {
    primary.onMouseOut(event);
}

function auxiliary0OnLoad(event) {
    auxiliary0.onLoad(event);
}

function auxiliary1OnLoad(event) {
    auxiliary1.onLoad(event);
}

function primaryOnLoad(event) {
    primary.onLoad(event);
}

function submitTeach(text) {
    primary.teachStepAbacus(text);
}

function primaryTeach(event) {
    primary.teachAbacus(primary.display);
}

function auxiliary0Clear(event) {
    auxiliary0.clearAbacus(auxiliary0.display);
}

function auxiliary1Clear(event) {
    auxiliary1.clearAbacus(auxiliary1.display);
}

function primaryClear(event) {
    primary.clearAbacus(primary.display);
}

function auxiliary0Complement(event) {
    auxiliary0.complementAbacus(auxiliary0.display);
}

function auxiliary1Complement(event) {
    auxiliary1.complementAbacus(auxiliary1.display);
}

function primaryComplement(event) {
    primary.complementAbacus(primary.display);
}

function auxiliary0Undo(event) {
    auxiliary0.undoAbacus(auxiliary0.display);
}

function auxiliary1Undo(event) {
    auxiliary1.undoAbacus(auxiliary1.display);
}

function primaryUndo(event) {
    primary.undoAbacus(primary.display);
}

function auxiliary0Redo(event) {
    auxiliary0.redoAbacus(auxiliary0.display);
}

function auxiliary1Redo(event) {
    auxiliary1.redoAbacus(auxiliary1.display);
}

function primaryRedo(event) {
    primary.redoAbacus(primary.display);
}

function auxiliary0Decrement(event) {
    auxiliary0.decrementAbacus(auxiliary0.display);
}

function auxiliary1Decrement(event) {
    auxiliary1.decrementAbacus(auxiliary1.display);
}

function primaryDecrement(event) {
    primary.decrementAbacus(primary.display);
}

function auxiliary0Increment(event) {
    auxiliary0.incrementAbacus(auxiliary0.display);
}

function auxiliary1Increment(event) {
    auxiliary1.incrementAbacus(auxiliary1.display);
}

function primaryIncrement(event) {
    primary.incrementAbacus(primary.display);
}

function auxiliary0Rails(event) {
    auxiliary0.railsAbacus(auxiliary0.display);
}

function auxiliary1Rails(event) {
    auxiliary1.railsAbacus(auxiliary1.display);
}

function primaryRails(event) {
    primary.railsAbacus(primary.display);
}

function primaryFullScreen(event) {
    primary.fullScreenAbacus(document.body);
}

function getCharPress(event) {
    event = event || window.event;
    var charCode = event.keyCode || event.which;
    var charStr = String.fromCharCode(charCode);
    if (charStr === "c") {
        if (auxiliary0 !== null)
            auxiliary0.clearAbacus(auxiliary0.display);
        if (auxiliary1 !== null)
            auxiliary1.clearAbacus(auxiliary1.display);
        primary.clearAbacus(primary.display);
    } else if (charStr === "~") {
        if (auxiliary0 !== null)
            auxiliary0.complementAbacus(auxiliary0.display);
        if (auxiliary1 !== null)
            auxiliary1.complementAbacus(auxiliary1.display);
        primary.complementAbacus(primary.display);
    } else if (charStr === "u") {
        if (auxiliary0 !== null)
            auxiliary0.undoAbacus(auxiliary0.display);
        if (auxiliary1 !== null)
            auxiliary1.undoAbacus(auxiliary1.display);
        primary.undoAbacus(primary.display);
    } else if (charStr === "e") {
        if (auxiliary0 !== null)
            auxiliary0.redoAbacus(auxiliary0.display);
        if (auxiliary1 !== null)
            auxiliary1.redoAbacus(auxiliary1.display);
        primary.redoAbacus(primary.display);
    } else if (charStr === "d") {
        if (auxiliary0 !== null)
            auxiliary0.decrementAbacus(auxiliary0.display);
        if (auxiliary1 !== null)
            auxiliary1.decrementAbacus(auxiliary1.display);
        primary.decrementAbacus(primary.display);
    } else if (charStr === "i") {
        if (auxiliary0 !== null)
            auxiliary0.incrementAbacus(auxiliary0.display);
        if (auxiliary1 !== null)
            auxiliary1.incrementAbacus(auxiliary1.display);
        primary.incrementAbacus(primary.display);
    }
}

function initAbacus(canvasElement, spanElement, railsElement) {
    init(abaci, 1);
    primary = abaci[0];
    primary.initSpaceAbacus();
    if (!canvasElement) {
        canvasElement = document.createElement("canvas");
        canvasElement.setAttribute("style", "vertical-align: bottom; display:block;");
        document.body.appendChild(canvasElement);
    }
    canvasElement.id = "abacus_canvas";
    primary.abacusCanvasElement = canvasElement;
    if (!spanElement) {
        spanElement = document.createElement("p");
        document.body.appendChild(spanElement);
    }
    spanElement.id = "abacus_p";
    primary.display.spanElement = spanElement;
    if (!railsElement) {
        railsElement = document.createElement("input");
        document.body.appendChild(railsElement);
    }
    railsElement.id = "abacus_rails";
    primary.display.railsElement = railsElement;
    if (primary.display.spanElement.addEventListener) {
        primary.display.spanElement.addEventListener("keypress",
            primaryOnKeyPress, false);
    }
    if (primary.abacusCanvasElement.addEventListener) {
        primary.abacusCanvasElement.addEventListener("mousedown",
            primaryOnMouseDown, false);
        primary.abacusCanvasElement.addEventListener("mouseup",
            primaryOnMouseUp, false);
        primary.abacusCanvasElement.addEventListener("touchstart",
            primaryOnTouchStart, false);
        primary.abacusCanvasElement.addEventListener("touchend",
            primaryOnTouchStop, false);
        primary.abacusCanvasElement.addEventListener("mouseout",
            primaryOnMouseOut, false);
    }
    if (window.addEventListener) {
        window.addEventListener("keypress", getCharPress, false);
        window.addEventListener("load", primaryOnLoad, false);
    }
    if (document.getElementById("teach")) {
        document.getElementById("teach").addEventListener("click",
            primaryTeach);
    }
    if (document.getElementById("clear")) {
        document.getElementById("clear").addEventListener("click",
            primaryClear);
    }
    if (document.getElementById("complement")) {
        document.getElementById("complement").addEventListener("click",
            primaryComplement);
    }
    if (document.getElementById("undo")) {
        document.getElementById("undo").addEventListener("click",
            primaryUndo);
    }
    if (document.getElementById("redo")) {
        document.getElementById("redo").addEventListener("click",
            primaryRedo);
    }
    if (document.getElementById("decrement")) {
        document.getElementById("decrement").addEventListener("click",
            primaryDecrement);
    }
    if (document.getElementById("increment")) {
        document.getElementById("increment").addEventListener("click",
            primaryIncrement);
    }
    if (primary.display.railsElement.addEventListener) {
        primary.display.railsElement.addEventListener("click",
            primaryRails);
        primary.display.railsElement.addEventListener("change",
            primaryRails);
    }
    if (document.getElementById("fullScreen")) {
        document.getElementById("fullScreen").addEventListener("click",
            primaryFullScreen);
    }
    if (!primary.abacusCanvasElement.getContext) {
        alert("Canvas is unsupported in your browser.");
        return;
    }
    primary.setFormatFromElement(primary.display, "abacus_article");
    primary.setSize();
    primary.setStyleDisplay(primary.display);
    primary.abacusCanvasElement.style.backgroundColor = primary.background;
    primary.drawingContext = primary.abacusCanvasElement.getContext("2d");
    //if (!resumeAbacus())
        primary.clearAbacus(primary.display);
}

function initLeeAbacus(canvas0Element, canvas1Element, canvasElement,
        span0Element, span1Element, spanElement,
        rails0Element, rails1Element, railsElement) {
    var number = LEE;
    init(abaci, number);
    auxiliary0 = abaci[0];
    auxiliary1 = abaci[1];
    primary = abaci[2];
    for (var aux = 0; aux < number; aux++) {
       abaci[aux].initSpaceAbacus();
    }
    // Wanted a form here to force canvases on one line,
    // but seemed to turn off interaction.
    if (!canvas0Element) {
        canvas0Element = document.createElement("canvas");
        canvas0Element.setAttribute("style", "vertical-align: bottom; display:inline-block;");
        document.body.appendChild(canvas0Element);
    }
    canvas0Element.id = "auxiliary0_canvas";
    auxiliary0.abacusCanvasElement = canvas0Element;

    if (!canvas1Element) {
        canvas1Element = document.createElement("canvas");
        canvas1Element.setAttribute("style", "vertical-align: bottom; display:inline-block;");
        document.body.appendChild(canvas1Element);
    }
    canvas1Element.id = "auxiliary1_canvas";
    auxiliary1.abacusCanvasElement = canvas1Element;

    if (!canvasElement) {
        canvasElement = document.createElement("canvas");
        canvasElement.setAttribute("style", "vertical-align: bottom; display:block;");
        document.body.appendChild(canvasElement);
    }
    canvasElement.id = "primary_canvas";
    primary.abacusCanvasElement = canvasElement;

    if (!span0Element) {
        span0Element = document.createElement("p");
        document.body.appendChild(span0Element);
    }
    span0Element.id = "auxiliary0_p";
    auxiliary0.display.spanElement = span0Element;
    if (auxiliary0.display.spanElement.addEventListener) {
        auxiliary0.display.spanElement.addEventListener("keypress",
            auxiliary0OnKeyPress, false);
    }
    if (!span1Element) {
        span1Element = document.createElement("p");
        document.body.appendChild(span1Element);
    }
    span1Element.id = "auxiliary1_p";
    auxiliary1.display.spanElement = span1Element;
    if (auxiliary1.display.spanElement.addEventListener) {
        auxiliary1.display.spanElement.addEventListener("keypress",
            auxiliary1OnKeyPress, false);
    }
    if (!spanElement) {
        spanElement = document.createElement("p");
        document.body.appendChild(spanElement);
    }
    spanElement.id = "primary_p";
    primary.display.spanElement = spanElement;
    if (!railsElement) {
        railsElement = document.createElement("input");
        document.body.appendChild(railsElement);
    }
    railsElement.id = "primary_rails";
    primary.display.railsElement = railsElement;
    if (!rails0Element) {
        rails0Element = document.createElement("input");
        document.body.appendChild(rails0Element);
    }
    rails0Element.id = "auxiliary0_rails";
    auxiliary0.display.railsElement = rails0Element;
    if (!rails1Element) {
        rails1Element = document.createElement("input");
        document.body.appendChild(rails1Element);
    }
    rails1Element.id = "auxiliary1_rails";
    auxiliary1.display.railsElement = rails1Element;
    if (primary.display.spanElement.addEventListener) {
        primary.display.spanElement.addEventListener("keypress",
            primaryOnKeyPress, false);
    }
    if (auxiliary0.abacusCanvasElement.addEventListener) {
        auxiliary0.abacusCanvasElement.addEventListener("mousedown",
            auxiliary0OnMouseDown, false);
        auxiliary0.abacusCanvasElement.addEventListener("mouseup",
            auxiliary0OnMouseUp, false);
        auxiliary0.abacusCanvasElement.addEventListener("touchstart",
            auxiliary0OnTouchStart, false);
        auxiliary0.abacusCanvasElement.addEventListener("touchend",
            auxiliary0OnTouchStop, false);
        auxiliary0.abacusCanvasElement.addEventListener("mouseout",
            auxiliary0OnMouseOut, false);
    }
    if (auxiliary1.abacusCanvasElement.addEventListener) {
        auxiliary1.abacusCanvasElement.addEventListener("mousedown",
            auxiliary1OnMouseDown, false);
        auxiliary1.abacusCanvasElement.addEventListener("mouseup",
            auxiliary1OnMouseUp, false);
        auxiliary1.abacusCanvasElement.addEventListener("touchstart",
            auxiliary1OnTouchStart, false);
        auxiliary1.abacusCanvasElement.addEventListener("touchend",
            auxiliary1OnTouchStop, false);
        auxiliary1.abacusCanvasElement.addEventListener("mouseout",
            auxiliary1OnMouseOut, false);
    }
    if (primary.abacusCanvasElement.addEventListener) {
        primary.abacusCanvasElement.addEventListener("mousedown",
            primaryOnMouseDown, false);
        primary.abacusCanvasElement.addEventListener("mouseup",
            primaryOnMouseUp, false);
        primary.abacusCanvasElement.addEventListener("touchstart",
            primaryOnTouchStart, false);
        primary.abacusCanvasElement.addEventListener("touchend",
            primaryOnTouchStop, false);
        primary.abacusCanvasElement.addEventListener("mouseout",
            primaryOnMouseOut, false);
    }
    if (window.addEventListener) {
        window.addEventListener("keypress", getCharPress, false);
        window.addEventListener("load", auxiliary0OnLoad, false);
        window.addEventListener("load", auxiliary1OnLoad, false);
        window.addEventListener("load", primaryOnLoad, false);
    }
    if (document.getElementById("auxiliary0_clear")) {
        document.getElementById("auxiliary0_clear").addEventListener("click",
            auxiliary0Clear);
    }
    if (document.getElementById("auxiliary1_clear")) {
        document.getElementById("auxiliary1_clear").addEventListener("click",
            auxiliary1Clear);
    }
    if (document.getElementById("teach")) {
        document.getElementById("teach").addEventListener("click",
            primaryTeach);
    }
    if (document.getElementById("clear")) {
        document.getElementById("clear").addEventListener("click",
            primaryClear);
    }
    if (document.getElementById("auxiliary0_complement")) {
        document.getElementById("auxiliary0_complement").addEventListener("click",
            auxiliary0Complement);
    }
    if (document.getElementById("auxiliary1_complement")) {
        document.getElementById("auxiliary1_complement").addEventListener("click",
            auxiliary1Complement);
    }
    if (document.getElementById("complement")) {
        document.getElementById("complement").addEventListener("click",
            primaryComplement);
    }
    if (document.getElementById("auxiliary0_undo")) {
        document.getElementById("auxiliary0_undo").addEventListener("click",
            auxiliary0Undo);
    }
    if (document.getElementById("auxiliary1_undo")) {
        document.getElementById("auxiliary1_undo").addEventListener("click",
            auxiliary1Undo);
    }
    if (document.getElementById("undo")) {
        document.getElementById("undo").addEventListener("click",
            primaryUndo);
    }
    if (document.getElementById("auxiliary0_redo")) {
        document.getElementById("auxiliary0_redo").addEventListener("click",
            auxiliary0Redo);
    }
    if (document.getElementById("auxiliary1_redo")) {
        document.getElementById("auxiliary1_redo").addEventListener("click",
            auxiliary1Redo);
    }
    if (document.getElementById("redo")) {
        document.getElementById("redo").addEventListener("click",
            primaryRedo);
    }
    if (document.getElementById("auxiliary0_decrement")) {
        document.getElementById("auxiliary0_decrement").addEventListener("click",
            auxiliary0Decrement);
    }
    if (document.getElementById("auxiliary1_decrement")) {
        document.getElementById("auxiliary1_decrement").addEventListener("click",
            auxiliary1Decrement);
    }
    if (document.getElementById("decrement")) {
        document.getElementById("decrement").addEventListener("click",
            primaryDecrement);
    }
    if (document.getElementById("auxiliary0_increment")) {
        document.getElementById("auxiliary0_increment").addEventListener("click",
            auxiliary0Increment);
    }
    if (document.getElementById("auxiliary1_increment")) {
        document.getElementById("auxiliary1_increment").addEventListener("click",
            auxiliary1Increment);
    }
    if (document.getElementById("increment")) {
        document.getElementById("increment").addEventListener("click",
            primaryIncrement);
    }
    if (auxiliary0.display.railsElement.addEventListener) {
        auxiliary0.display.railsElement.addEventListener("click",
            auxiliary0Rails);
        auxiliary0.display.railsElement.addEventListener("change",
            auxiliary0Rails);
    }
    if (auxiliary1.display.railsElement.addEventListener) {
        auxiliary1.display.railsElement.addEventListener("click",
            auxiliary1Rails);
        auxiliary1.display.railsElement.addEventListener("change",
            auxiliary1Rails);
    }
    if (primary.display.railsElement.addEventListener) {
        primary.display.railsElement.addEventListener("click",
            primaryRails);
        primary.display.railsElement.addEventListener("change",
            primaryRails);
    }
    if (!primary.abacusCanvasElement.getContext) {
        alert("Canvas is unsupported in your browser.");
        return;
    }
    for (var i = 0; i < number; i++) {
        abaci[i].setFormatFromElement(abaci[i].display, (i === number - 1) ?
            "primary_article" : ("auxiliary" + i + "_article"));
        abaci[i].setSize();
        abaci[i].setStyleDisplay(abaci[i].display);
        abaci[i].abacusCanvasElement.style.backgroundColor =
            abaci[i].background;
        abaci[i].drawingContext =
            abaci[i].abacusCanvasElement.getContext("2d");
        //if (!resumeAbacus())
            abaci[i].clearAbacus(abaci[i].display);
    }
}
