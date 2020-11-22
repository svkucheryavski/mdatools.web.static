// ******************************
//  A set of class free methods
// ******************************

function mean(x) {
   const sum = x.reduce((a, b) => a + b, 0);
   const avg = (sum / x.length) || 0;
   return avg;
}

class modelPlotParam {
   static calres(param = {}) {
      return {
         type: param.type ? param.type : 'p',
         color: 'dodgerblue',
         markerSymbol: 'circle-closed',
         currentColor: '#1564b2',
         currentMarkerSize: 8,
         markerSize: 6,
         current: param.current,
         oopacity: param.opacity ? param.opacity : 1,
         showLabels: param.showLabels ? param.showLabels : false,
         colorby: param.colorby && param.colorby != 'none' ? param.colorby : null,
         groupby: param.groupby && param.groupby != 'none'  ? param.groupby : null
      };
   }

   static cvres(param = {}) {
      return {
         type: param.type ? param.type : 'p',
         color: '#f31414',
         markerSymbol: 'diamond',
         currentColor: '#a20000',
         currentMarkerSize: 8,
         markerSize: 6,
         current: param.current ? param.current : null,
         opacity: param.opacity ? param.opacity : 1,
         showLabels: false,
         colorby: param.colorby && param.colorby != 'none' ? param.colorby : null,
         groupby: param.groupby && param.groupby != 'none'  ? param.groupby : null
      };
   }
}

/**
 * Returns indices of sorted values
 * @param {*} arr Array of numeric values
 */
function sort(arr) {
   let map = arr.map(function(v, i) { return {index: i, value: v}; });
   map.sort(function(a, b) { return a.value - b.value; });
   return map.map(function(e){ return e.index; });
}

/**
 * Permutes randomly elements in an array
 */
function shuffle(array) {
   let currentIndex = array.length, temporaryValue, randomIndex;

   // While there remain elements to shuffle...
   while (0 !== currentIndex) {

     // Pick a remaining element...
     randomIndex = Math.floor(Math.random() * currentIndex);
     currentIndex -= 1;

     // And swap it with the current element.
     temporaryValue = array[currentIndex];
     array[currentIndex] = array[randomIndex];
     array[randomIndex] = temporaryValue;
   }

   return array;
 }

function round(x) { return Math.round(x); }

/**
 * Generates a sequence of numbers from start to end with increment = step
 * @param {number} start Start of the sequence
 * @param {number} end End of the sequence
 * @param {number} step Increment (default 1)
 */
function seq(start, end, step = 1) {
   const n = Math.floor((end - start + 1) / step);
   const x = Array.apply(null, { length: n }).map(Number.call, function (i) { return (start + i * step); });

   return x;
}

/**
 * Repeats several values and combine them into a vector
 * @param {number|string} value - a value to repeat
 * @param {number} n - how many times repeat the value
 */
function rep (value, n) {
   return Array(n).fill(value);
}

/**
 * Returns a vector with strings (combination of str and every value from a vector)
 * @param {string} str - string to combine the values with
 * @param {Array} values - vector with values
 */
function paste(str, values, sep = ' ') {
   return values.map(function (x, i) { return str + sep + values[i]; });
}

/**
 * Applies a specific function to all values to every row of an array
 * @param {number[]} arr Numeric 2D array with data values
 * @param {string} fun A function name: 'sum', 'min', 'max', 'sd'
 * @returns {number[]} A vector with calculated values for each roq of arr
 */
function rowFun (arr, fun) {
   let f;
   switch (fun) {
      case 'sum':
         f = function (x) {
            s = 0;
            for (var j = 0, l = x.length; j < l; j++) {
               s = s + x[j];
            }
            return s;
         };
         break;
      case 'min':
         f = function (x) {
            return Math.min.apply(Math, x);
         };
         break;
      case 'max':
         f = function (x) {
            return Math.max.apply(Math, x);
         };
         break;
   }
   n = arr.length;
   out = new Array(n);
   if (fun != 'sd') {
      for (let i = 0; i < n; i++) {
         out[i] = f(arr[i]);
      }
   } else {
      m = rowMean(arr);
      k = arr[0].length;
      for (let i = 0; i < n; i++) {
         out[i] = 0;
         for (let j = 0; j < k; j++) {
            out[i] = out[i] + Math.pow(arr[i][j] - m[i], 2);
         }
         out[i] = Math.sqrt(out[i] / (k - 1));
      }
   }

   return out;
}

/**
 * Computes sum of values in each row of a 2D array
 * @param {number[]} arr Numeric 2D array with data values
 */
function rowSum (arr) { return rowFun(arr, 'sum'); }

/**
 * Computes mean of values in each row of a 2D array
 * @param {number[]} arr Numeric 2D array with data values
 */
function rowMean (arr) { return numeric.div(rowFun(arr, 'sum'), arr[0].length); }

/**
 * Finds the smallest value in each row of a 2D array
 * @param {number[]} arr Numeric 2D array with data values
 */
function rowMin (arr) { return rowFun(arr, 'min'); }

/**
 * Finds the largest value in each row of a 2D array
 * @param {number[]} arr Numeric 2D array with data values
 */
function rowMax (arr) { return rowFun(arr, 'max'); }

/**
 * Computes standard deviation for each row of a 2D array
 * @param {number[]} arr Numeric 2D array with data values
 */
function rowSd (arr) { return rowFun(arr, 'sd'); }

/**
 * Autoscale values in a 2D array
 * @param {number[]} arr Numeric 2D array
 * @param {boolean | numbe[]} center Logical value or a vector used to center the data
 * @param {boolean | number[]} scale Logical value or a vector used to scale the data
 * @returns {number[]} Matrix with autoscaled values
 */
function autoscale (arr, center, scale) {
   const nvar = arr.length;
   const nobj = arr[0].length;

   let m = null;
   if (typeof (center) == 'boolean' || center == null) {
      if (center) {
         m = numeric.transpose(numeric.rep([nobj], rowMean(arr)));
      } else {
         m = numeric.rep([nvar, nobj], 0);
      }
   } else {
      m = numeric.transpose(numeric.rep([nobj], center));
   }

   let s = null;
   if (typeof (scale) == 'boolean' || scale == null) {
      if (scale) {
         s = numeric.transpose(numeric.rep([nobj], rowSd(arr)));
      } else {
         s = numeric.rep([nvar, nobj], 1);
      }
   } else {
      s = numeric.transpose(numeric.rep([nobj], scale));
   }
   return numeric.div(numeric.sub(arr, m), s);
}

/**
 * Resizes plot according to the size of its parent DOM element
 * @param {Object} obj DOM element with the plot
 */
function resizePlot (obj) {
   if (obj == null) {
      return;
   }

   const style = getComputedStyle(obj);
   const update = {
      width: obj.clientWidth,
      height: obj.clientHeight + parseInt(style.marginBottom) - 4
   };

   Plotly.relayout(obj, update);
}
