// *******************************
//    Dataset class and methods
// *******************************
//    written using ES6 

'strict mode';

/**
 * Class for keeping and visualasing 2D datasets
 * @class
 * @param {number[]} values Numeric 2D array with data values
 * @param {string[]} varNames Vector with names for variables
 * @param {string[]} objNames Vector with names for objects
 * @param {string} name Name of the dataset 
 * @param {string} info Short info for the data 
 * @param {string} varAxisName Name of the x-axis (for line and bar plots)
 * @param {number[]} varAxisValues Vector with values for x-axis
 * @param {string} objAxisName Name of the y-axis (for line and bar plots)
 * @param {number[]} objAxisValues Vector with y-values 
 */
class Dataset {
   constructor (
      values, varNames = null, objNames = null, name = '', info = '', varAxisName = 'Variables', 
      varAxisValues = null, objAxisName = 'Objects', objAxisValues = null) {
  
      // if 1D array is provided as values, convert it to 2D array
      if (!Array.isArray(values[0])) {
         values = [values];
      }

      // main properties
      this.values = values;
      this.nVar = values.length;
      this.nObj = values[0].length;
      this.name = name;
      this.info = info;
      this.varAxisName = varAxisName;
      this.objAxisName = objAxisName;

      // set names for variables
      if (varNames == null || varNames.length != this.nVar) {
         this.varNames = [];
         for (let i = 1; i <= this.nVar; i++) {
            this.varNames.push('X' + i);
         }
      } else {
         this.varNames = varNames;
      }

      // set names for objects
      if (objNames == null || objNames.length != this.nObj) {
         this.objNames = [];
         for (let i = 1; i <= this.nObj; i++) {
            this.objNames.push('O' + i);
         }
      } else {
         this.objNames = objNames;
      }

      // set values for variables' axis
      if (varAxisValues  == null || varAxisValues.length != this.nVar) {
         this.varAxisValues = seq(1, this.nVar);
      } else {
         this.varAxisValues = varAxisValues;
      }

      // set values for objects' axis
      if (objAxisValues  == null || objAxisValues.length != this.nObj) {
         this.objAxisValues = seq(1, this.nObj);
      } else {
         this.objAxisValues = objAxisValues;
      }
   }

   /**
    * Returns div with representation of the dataset as HTML table 
    */
   asTable (param = {}) {
      if (param.showObjNames == undefined) param.showObjNames = false;
      if (param.current == undefined) param.current = -1;
      if (param.selected == undefined) param.selected = [];
      if (param.class == undefined) param.class = '';
      if (param.dec == undefined) param.dec = 1;
      
      if (!Array.isArray(param.selected)) {
         param.selected = [param.selected];
      }

      let html = '';
      if (param.id) {
         html += '<table id="' + param.id + '" class="' + param.class + '">';         
      } else {
         html += '<table class="' + param.class + '">';                  
      }

      html += '<thead>';
      html += '<tr>';

      if (param.showObjNames) {
         html += '<th></th>';
      }

      for (var i = 0; i < this.nVar; i++) {
         html += '<th>' + this.varNames[i] + '</th>';
      }

      html += '</thead>';
      html += '<tbody>';
      for (let i = 0; i < this.nObj; i++) {            
         
         let trClass = '';
         
         if (i == param.current) {
            trClass += ' current';
         } 

         if (param.selected.includes(i)) {
            trClass += ' selected';
         } 

         if (trClass.length > 0) {
            html += '<tr class="' + trClass + '">';
         } else {
            html += '<tr>';            
         }

         if (param.showObjNames) {
            html += '<td class="name">' + this.objNames[i] + '</td>';
         }

         for (var j = 0; j < this.nVar; j++) {
            if (this.values[j][i] != null && this.values[j][i] != undefined) {
               html += '<td>' + this.values[j][i].toFixed(param.dec) + '</td>';                  
            } else {
               html += '<td></td>';                                    
            }
         }
      }

      html += '</tbody>';
      html += '</table>';
      return html;
   }

   /** Binds dataset with another one row wise
    * @param {Dataset} x Dataset object to bind the current with
    * @returns {Dataset}
    */
   rbind (x) {
      if (x.nVar != this.nVar) {
         throw 'Dataset.rbind(): number of columns are not consistent!';
      }

      let values = Array(this.nVar);
      for (let i = 0; i < values.length; i++) {
         values[i] = this.values[i].concat(x.values[i]);
      }
      
      return new Dataset(
         values,
         this.varNames,
         this.objNames.concat(x.objNames),
         this.name,
         this.info,
         this.varAxisName,
         this.varAxisValues,
         this.objAxisName,
         this.objAxisValues.concat(x.objAxisValues)
      );
   }

   /** Binds dataset with another one column wise
    * @param {Dataset} x Dataset object to bind the current with
    * @returns {Dataset}
    */
    cbind (x) {
      if (x.nObj != this.nObj) {
         throw 'Dataset.cbind(): number of objects is not consistent!';
      }
      
      return new Dataset(
         this.values.concat(x.values),
         this.varNames.concat(x.varNames),
         this.objNames,
         this.name,
         this.info,
         this.varAxisName,
         this.varAxisValues.concat(x.varAxisValues),
         this.objAxisName,
         this.objAxisValues
      );
   }

   /**
    * Returns a vector with values for specific variable
    * @param {string} name - name of variable
    */
   getVariableValues (name) {
      const n = this.varNames.indexOf(name);
      if (n >= 0) {
         return this.values[n];
      } else {
         return undefined;
      }
   }

   /**
    *  Creates a subset of the dataset
    * @param {number[] | string[] | boolean} vInd Names, indices or vector with logical values for variables
    * @param {number[] | string[] | boolean} oInd Names, indices or vector with logical values for objects
    * @returns {Dataset}
    */
   subset (vInd, oInd) {
      if (oInd  == undefined || oInd == null) {
         oInd = seq(0, this.nObj - 1);
      } else {
         // make an array if it is not
         if (!Array.isArray(oInd)) {
            oInd = [oInd];
         }

         if (typeof (oInd[0]) == 'boolean') {
            // TODO: write a code for generating indices using logical expressions         
         } else if (typeof (oInd[0]) == 'string') {
            oInd = oInd.map((x) => this.objNames.indexOf(x));
         }
      }

      if (vInd  == undefined || vInd == null) {
         vInd = seq(0, this.nVar - 1);
      } else {
         // make an array if it is not
         if (!Array.isArray(vInd)) {
            vInd = [vInd];
         }
         if (typeof (vInd[0]) == 'boolean') {
            // TODO: write a code for generating indices using logical expressions         
         } else if (typeof (vInd[0]) == 'string') {
            vInd = vInd.map((x) => this.varNames.indexOf(x));
         }
      }
            
      let subsetValues = new Array(vInd.length);
      let subsetVarNames = [];
      let subsetObjNames = [];
      let subsetVarAxisValues = [];
      let subsetObjAxisValues = [];

      for (let v = 0; v < vInd.length; v++) {
         subsetValues[v] = [];
         subsetVarNames.push(this.varNames[vInd[v]]);
         subsetVarAxisValues.push(this.varAxisValues[vInd[v]]);
         for (let o = 0; o < oInd.length; o++) {
            subsetValues[v].push(this.values[vInd[v]][oInd[o]]);
            if (v == 0) {
               subsetObjNames.push(this.objNames[oInd[o]]);
               subsetObjAxisValues.push(this.objAxisValues[oInd[o]]);
            }
         }
      }

      return new Dataset(
         subsetValues,
         subsetVarNames,
         subsetObjNames,
         this.name,
         this.info,
         this.varAxisName,
         subsetVarAxisValues,
         this.objAxisName,
         subsetObjAxisValues
      );
   }

   /**
    * Transpose the dataset    
    */
   t () {
      return new Dataset(
         numeric.transpose(this.values),
         this.objNames,
         this.varNames,
         this.name,
         this.info,
         this.objAxisName,
         this.objAxisValues,
         this.varAxisName,
         this.varAxisValues
      );
   }

   /**
    * Sorting rows/objects of the dataset
    * @param {*} vInd Index or name of variable to sort
    */
    sort(vInd) {
   
      // TODO: implement ascend/descend sorting

      // convert variable name to index
      if (typeof (vInd) == 'string') {
         vInd = this.varNames.indexOf(vInd);
      }

      if (vInd < 0 || vInd > this.nVar - 1) {
         throw 'Dataset.sort(): wrong index or name for the variable!';
      }

      // sort values in selected variable and get indices of sorted values
      const newData = this.subset(null, sort(this.values[vInd]));
      
      this.values = newData.values;
      this.objNames = newData.objNames;
      this.objAxisValues = newData.objAxisValues;
   }

   /**
    * Calculates mean values for each variable and return result as dataset
    */
   mean () {
      return new Dataset (
         numeric.transpose([rowMean(this.values)]),
         this.Varnames,
         ['Mean'],
         this.name,
         this.info,
         this.varAxisName,
         this.varAxisValues,
         null,
         null
      );
   }

   /**
    * Creates a plot for the data values
    * @param {HTMLDomObject} id - ID of DOM object (div) to show the plot in 
    * @param {Object} param - JSON object with plot parameters 
    */
   plot (plotPane = null, param = {}) {
      // handling plot parameters
      if (param.type == undefined) param.type = 'p';
      if (param.color == undefined) param.color = 'dodgerblue';
      if (param.opacity == undefined) param.opacity = 1;
      if (param.lineWidth == undefined) param.lineWidth = 1;

      if (param.markerSize == undefined) param.markerSize = 5;
      if (param.markerSymbol == undefined) param.markerSymbol = 'circle-open';      

      if (param.titleFont == undefined) param.titleFont = { family: 'Arial', size: 14 };
      if (param.axisTitleFont == undefined) param.axisTitleFont = { family: 'Arial', size: 12 };
      if (param.plotMargin == undefined) param.plotMargin = { l: 60, r: 30, b: 70, t: 50 };

      if (param.currentColor == undefined) param.selectedColor = 'darkblue';
      if (param.currentMarkerSize == undefined) param.selectedMarkerSize = 7;
      if (param.currentMarkerSymbol == undefined) param.selectedMarkerSymbol = 'circle';
      
      if (param.labelsColor == undefined) param.labelsColor = '#d0d0d0';
      if (param.showLegend == undefined) param.showLegend = false;
      if (param.showLabels == undefined) param.showLabels = false;

      let plotTrace = [];
      let plotLayout = {};

      // which plot to make (scatter: 'p', line: 'l', line-scatter: 'b', or bar 'h')
      if (param.type == 'p') {

         // if there is only one variable, makes a plot vs object number
         if (this.nVar < 2) {
            const plotData = new Dataset(
               [this.objAxisValues, this.values[0]],
               [this.objAxisName, this.varNames[0]],
               this.objNames,
               this.name            
            );
            return plotData.plot(plotPane, param);
         } 

         // set color options: color gradient, main color + selected with red, main color only 
         if (param.colorby) {
            param.color = param.colorby;
            param.colorscale = 'Portland';
         } 

         // create a plot trace for data
         plotTrace.push({
            opacity: param.opacity,
            hoverinfo: 'values',
            text: (param.showLabels ? this.objNames : null),
            textposition: 'top',
            textfont: {
               color: param.labelsColor,
               size: 9
            },
            type: 'scatter',
            x: this.values[0],
            y: this.values[1],
            mode: (param.showLabels ? 'markers+text' : 'markers'),
            marker: {
               color: param.color,
               colorscale: param.colorscale,
               size: param.markerSize,
               symbol: param.markerSymbol
            }
         });
         
         // create a plot trace for selected objects
         if (param.current != undefined && param.current >= 0 && param.current < this.nObj) {
            plotTrace.push({
               opacity: 1,
               type: 'scatter',
               text: null,
               hoverinfo: 'values',
               x: [this.values[0][param.current]],
               y: [this.values[1][param.current]],
               mode: 'markers',
               marker: {
                  color: param.currentColor,
                  size: param.currentMarkerSize,
                  symbol: param.currentMarkerSymbol
               }
            });
         }   
               
         // define label for x-axis
         if (param.xlab == undefined) {
            param.xlab = this.varNames[0];
         }

         // define label for y-axis
         if (param.ylab == undefined) {
            param.ylab = this.varNames[1];
         }
   
         // create a plot layout
         plotLayout = {
            title: '<b>' + this.name + '</b>',
            titlefont: param.titleFont,
            xaxis: { title: '<b>' + param.xlab + '</b>', titlefont: param.axisTitleFont },
            yaxis: { title: '<b>' + param.ylab + '</b>', titlefont: param.axisTitleFont },
            showlegend: param.showLegend,
            margin: param.plotMargin,
            hovermode:'closest',
         };

      } else if (param.type == 'l' || param.type == 'b') {

         // set color options: color gradient, main color + selected with red, main color only 
         if (param.colorby) {
            param.color = param.colorby;
            param.colorscale = 'Jet';
         } 

         // loop for creating of an array of plot traces - one for each object
         for (let i = 0; i < this.nVar; i++) {
            plotTrace.push({
               type: 'scatter',
               opacity: param.opacity,
               hoverinfo: 'values',
               mode: (param.type == 'b' ? 'line+marker' : 'lines'),
               text: (param.showLabels ? this.objNames : null),
               textposition: 'top',
               x: this.objAxisValues,
               y: this.values[i],
               marker: {
                  color: param.color,
                  size: param.markerSize,
                  symbol: param.currentMarkerSymbol
               },
               line: {
                  color: param.color,
                  width: param.lineWidth,
               }
            });
         }
         
         // define label for x-axis
         if (param.xlab == undefined) {
            param.xlab = this.objAxisName;
         }

         // define label for y-axis
         if (param.ylab == undefined) {
            if (this.nVar > 1) {
               param.ylab = this.varAxisName;               
            } else {
               param.ylab = this.varNames[0];               
            }
         }

         // create a plot layout
         plotLayout = {
            title: '<b>' + this.name + '</b>',
            titlefont: param.titleFont,
            xaxis: { title: '<b>' + param.xlab + '</b>', titlefont: param.axisTitleFont },
            yaxis: { title: '<b>' + param.ylab + '</b>', titlefont: param.axisTitleFont },
            showlegend: param.showLegend,
            margin: param.plotMargin,
         };

      } else if (param.type == 'h') {

         // loop for creating of an array of plot traces - one for each object
         plotTrace.push({
            type: 'bar',
            mode: 'markers+text',
            opacity: param.opacity,
            hoverinfo: (param.showLabels ? 'none' : 'text'),
            text: this.values[0],
            textposition: 'top',
            textfont: {
               color: '#a0a0a0',
               size: 9
            },
            x: this.objAxisValues,
            y: this.values[0],
            marker: {
               color: param.color,
            },
         });

         // define label for x-axis
         if (param.xlab == undefined) {
            param.xlab = this.objAxisName;
         }

         // define label for y-axis
         if (param.ylab == undefined) {
            if (this.nVar > 1) {
               param.ylab = this.varAxisName;               
            } else {
               param.ylab = this.varNames[0];               
            }
         }

         // create a plot layout
         plotLayout = {
            title: '<b>' + this.name + '</b>',
            titlefont: param.titleFont,
            xaxis: { title: '<b>' + param.xlab + '</b>', titlefont: param.axisTitleFont },
            yaxis: { title: '<b>' + param.ylab + '</b>', titlefont: param.axisTitleFont },
            showlegend: param.showLegend,
            margin: param.plotMargin,
         };
      }

      // if plotPane is null, return only plot trace
      // otherwise create a plot a return the parnet DOM element
      if (plotPane == null) {
         return plotTrace;
      } else {
         Plotly.newPlot(plotPane, plotTrace, plotLayout, { displayModeBar: false });
         window.addEventListener('resize', function () { resizePlot(plotPane); });
         return plotPane;
      }
   }
}


// ******************************
//  Datasets for the apps
// ******************************

/* Wines data */
let wine = new Dataset(
   [
      [13.62, 14.06, 13.74, 13.95, 14.47, 14.61, 13.65, 14.12, 13.13, 13.49, 15.09, 14.63, 13.63, 13.67, 14.43, 13.45, 13.83, 13.85, 13.97, 12.84, 14.19, 14.13, 13.66, 14.27, 13.84, 13.58, 13.23, 13.61, 13.77, 13.62, 13.51, 12.79, 14.63, 13.96, 14.05, 14.02, 13.98, 14.50, 13.90, 14.22, 13.80, 14.45, 14.36, 14.25],
      [3.54, 3.74, 3.27, 3.66, 3.66, 3.45, 4.31, 3.88, 3.83, 3.69, 3.98, 4.78, 4.64, 3.87, 4.51, 4.34, 4.22, 4.16, 3.54, 3.22, 3.40, 3.62, 3.08, 3.43, 3.05, 3.24, 3.04, 3.08, 3.37, 3.49, 3.42, 2.99, 3.14, 4.55, 3.50, 3.88, 4.36, 4.42, 4.10, 4.06, 3.59, 3.84, 3.82, 3.57],
      [0.29, 0.59, 0.47, 0.47, 0.38, 0.52, 0.32, 0.37, 0.27, 0.32, 0.47, 0.43, 0.71, 0.54, 0.40, 0.46, 0.33, 0.36, 0.29, 0.34, 0.35, 0.33, 0.28, 0.44, 0.26, 0.24, 0.34, 0.28, 0.30, 0.21, 0.32, 0.37, 0.44, 1.03, 0.38, 0.41, 0.43, 0.36, 0.65, 0.42, 0.35, 0.34, 0.32, 0.48],
      [0.89, 0.24, -0.070, 0.090, 0.61, 0.16, 0.18, 0.36, 0.40, 0.50, 0.44, 0.52, 0.19, 0.16, 0.31, 0.47, 0.49, 0.17, 0.48, 0.42, 0.46, 0.31, 0.42, 0.45, 0.47, 0.53, 0.42, 0.51, 0.32, 0.45, 0.54, 0.29, 0.38, -0.62, 0.48, 0.45, 0.28, 0.53, 0.19, 0.28, 0.55, 0.71, 0.51, 0.39],
      [3.71, 3.73, 3.87, 3.79, 3.70, 3.92, 3.60, 3.70, 3.66, 3.70, 3.67, 3.53, 3.64, 3.65, 3.70, 3.48, 3.55, 3.54, 3.64, 3.71, 3.72, 3.64, 3.68, 3.76, 3.71, 3.62, 3.77, 3.64, 3.68, 3.58, 3.63, 3.70, 3.75, 3.88, 3.82, 3.68, 3.66, 3.62, 3.66, 3.63, 3.83, 3.76, 3.85, 3.70],
      [0.780, 1.25, 1.13, 1, 0.81, 1.76, 1.37, 1.02, 1.13, 1.02, 1.01, 0.840, 1.79, 1.22, 1.49, 1.17, 1.13, 0.960, 0.780, 1.19, 0.850, 0.820, 0.910, 0.790, 0.800, 0.830, 1.08, 0.940, 0.930, 0.800, 0.840, 1.27, 0.940, 2.95, 1.14, 1.01, 1.44, 0.980, 1.18, 1.25, 1.14, 1.01, 1.03, 0.95],
      [1.46, 2.42, 1.52, 4.17, 1.25, 1.40, 3.80, 4.32, 3.99, 6.40, 1.06, 1.20, 1.45, 0.620, 5.62, 1.28, 1.19, 2.59, 1.15, 1.37, 1.75, 1.78, 4.24, 1.52, 2.08, 2.45, 1.06, 4.10, 2.74, 1.37, 1.15, 1.16, 2.19, 2.36, 1.60, 1.45, 1.02, 0.760, 1.35, 1.54, 2.28, 2.12, 2.68, 1.93],
      [0.31, 0.18, 0.39, 0.41, 0.14, 0.10, 0.24, 0.32, 0.34, 0.13, -0.04, -0.05, 0.16, 0.37, 0.43, -0.01, 0.09, 0.20, 0.12, 0.12, 0.17, 0.26, 0.10, 0.060, 0.21, 0.26, 0.21, 0.060, 0.30, 0.26, 0.09, 0.20, 0.20, 0.25, -0.04, 0.07, 0.06, 0.16, 0.08, 0.09, 0.08, 0.20, -0.02, 0.07],
      [85.61, 175.2, 513.74, 379.4, 154.88, 156.3, 462.62, 244.15, 212.0, 419.38, 48.02, 154.82, 243.96, 563.4, 347.88, 263.46, 288.97, 272.19, 210.53, 338.87, 245.07, 183.7, 353.53, 247.29, 399.07, 475.89, 603.32, 400.47, 180.14, 495.33, 388.08, 390.15, 228.39, 282.74, 510.08, 243.58, 452.96, 184.94, 183.06, 246.34, 297.54, 104.27, 510.09, 260.08],
      [0.99, 1, 0.99, 1, 0.99, 0.99, 1, 1, 1, 1, 0.99, 1, 1, 0.99, 1, 0.99, 0.99, 1, 0.99, 1, 0.99, 0.99, 1, 0.99, 0.99, 0.99, 0.99, 1, 0.99, 0.99, 0.99, 0.99, 0.99, 0.99, 1, 0.99, 0.99, 0.99, 0.99, 0.99, 1, 1, 1, 0.99],
      [60.92, 70.64, 63.59, 73.30, 71.69, 71.79, 59.60, 59.50, 59.42, 63.86, 70.10, 72.37, 55.07, 63.04, 63.52, 62.69, 59.08, 83.51, 64.31, 53.10, 66.82, 64.83, 52.16, 63.75, 56.55, 53.13, 54.89, 54.26, 64.80, 58.83, 58.81, 50.44, 61.94, 44.68, 62.58, 60.87, 62.35, 60.13, 58.47, 57.08, 60.36, 68.68, 67.77, 57.86],
      [9.72, 10.05, 10.92, 9.690, 10.81, 10.19, 10.66, 11.07, 8.890, 10.35, 11.43, 11.64, 9.590, 11.28, 10.93, 9.460, 11.10, 10.45, 10.58, 8.800, 10.11, 9.850, 9.540, 9.930, 9.480, 9.330, 9.020, 9.380, 10.33, 9.870, 9.760, 8.120, 10.05, 8.230, 10.10, 10.61, 10.62, 12.52, 11.72, 10.24, 10.47, 11.18, 10.58, 9.940],
      [0.16, 0.20, 0.18, 0.23, 0.20, 0.19, 0.25, 0.25, 0.23, 0.26, 0.19, 0.28, 0.25, 0.14, 0.30, 0.18, 0.22, 0.24, 0.18, 0.17, 0.18, 0.22, 0.18, 0.21, 0.19, 0.15, 0.15, 0.17, 0.17, 0.19, 0.18, 0.13, 0.15, 0.17, 0.25, 0.20, 0.22, 0.22, 0.18, 0.22, 0.24, 0.21, 0.27, 0.20],
      [1.74, 1.58, 1.24, 2.26, 1.22, 0.90, 1.81, 1.65, 2.12, 1.81, 1.47, 2.12, 1.36, 1.01, 1.81, 2.13, 1.55, 2.47, 1.72, 1.85, 1.48, 1.83, 1.38, 1.48, 1.66, 1.63, 1.56, 1.42, 1.62, 1.78, 1.30, 1.46, 1.31, 0.910, 1.22, 1.31, 1.77, 1.56, 1.41, 1.50, 1.70, 1.53, 2.02, 1.43],
   ],
   [
      'Ethanol', 'TotalAcid', 'VolatileA', 'MalicAcid', 'pH', 'LacticAc', 'ReSugar', 'CitricAcid', 'CO2', 'Density', 'FolinC', 'Glycerol', 'Methanol', 'TartaricA'
   ],
   [
      'ARG-BNS1', 'ARG-DDA1', 'ARG-FFL1', 'ARG-FLM1', 'ARG-ICR1', 'ARG-SAL1', 'AUS-CAV1', 'AUS-EAG1', 'AUS-HAR1', 
      'AUS-IB41', 'AUS-KIL1', 'AUS-KIR1', 'AUS-NUG1', 'AUS-SOC1', 'AUS-TGH1', 'AUS-VAF1', 'AUS-WBL1', 'AUS-WES1', 
      'CHI-CDD1', 'CHI-CDM1', 'CHI-CMO1', 'CHI-CSU1', 'CHI-GNE1', 'CHI-IND1', 'CHI-LJO1', 'CHI-S151', 'CHI-SCH1', 
      'CHI-SHE1', 'CHI-SUN1', 'CHI-UND1', 'CHI-UTA1', 'CHI-VDA1', 'CHI-VDS1', 'SOU-HHI1', 'SOU-INS1', 'SOU-KWV1', 
      'SOU-NED1', 'SOU-PDM1', 'SOU-ROO1', 'SOU-RW21', 'SOU-SAV1', 'SOU-SIM1', 'SOU-SPI1','SOU-SRE1'
   ],
   'Wine',
   ''
);
wine.varAxisName = 'Variable #';
wine.objAxisName = 'Sample #';

/* People data */ 
let people = new Dataset(
   [
      [198, 184, 183, 166, 170, 172, 182, 180, 169, 168, 183, 157, 164, 162, 180, 180, 185, 187, 168, 166, 158, 177, 180, 181, 163, 162, 176, 175, 165, 161, 178, 160],
      [92, 84, 83, 47, 60, 64, 80, 80, 51, 52, 81, 47, 50, 49, 82, 81, 82, 84, 50, 49, 46, 65, 72, 75, 50, 50, 68, 67, 51, 48, 75, 48],
      [-1, -1, -1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1, -1, -1, -1, -1, 1, 1, 1, -1, -1, -1, 1, 1, -1, 1, 1, 1, -1, 1], 
      [48, 44, 44, 36, 38, 39, 42, 43, 36, 37, 42, 36, 38, 37, 44, 44, 45, 46, 37, 36, 34, 41, 43, 43, 36, 36, 42, 42, 36, 35, 42, 35],  
      [48, 33, 37, 32, 23, 24, 35, 36, 24, 27, 37, 32, 41, 40, 43, 46, 26, 27, 49, 21, 30, 26, 33, 42, 18, 20, 50, 55, 36, 41, 30, 40],    
      [45000, 33000, 34000, 28000, 20000, 22000, 30000, 30000, 23000, 23500, 35000, 32000, 34000, 34000, 37000, 42000, 16000, 16500, 34000, 14000, 18000, 18000, 19000, 31000, 11000, 11500, 36000, 38000, 26000, 31500, 24000, 31000], 
      [420, 350, 320, 270, 312, 308, 398, 388, 250, 260, 345, 235, 255, 265, 355, 362, 295, 299, 170, 150, 120, 209, 236, 198, 143, 133, 195, 185, 121, 116, 203, 118],
      [115, 102, 98, 78, 99, 91, 65, 63, 89, 86, 45, 92, 134, 124, 82, 90, 180, 178, 162, 245, 120, 160, 175, 161, 136, 146, 177, 187, 129, 196, 208, 198],
      [-1, -1, -1, 1, 1, 1, -1, -1, 1, 1, -1, 1, 1, 1, -1, -1, -1, -1, 1, 1, 1, -1, -1, -1, 1, 1, -1, -1, 1, 1, -1, 1],
      [98, 92, 91, 75, 81, 82, 85, 84, 78, 78, 90, 70, 76, 75, 88, 86, 92, 95, 76, 75, 70, 86, 85, 83, 75, 74, 82, 80, 76, 75, 81, 74],
      [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, ],
      [100, 130, 127, 112, 110, 102, 140, 129, 98, 100, 105, 127, 101, 108, 109, 113, 109, 119, 135, 123, 119, 120, 115, 105, 102, 132, 96, 105, 126, 120, 118, 129]
   ],
   [
      'Height', 'Weight', 'Hairlength', 'Shoesize', 'Age', 'Income', 'Beer', 'Wine', 'Sex', 'Swim', 'Region', 'IQ'
   ],
   [
      'Lars', 'Peter', 'Rasmus', 'Lene', 'Mette', 'Gitte', 'Jens', 'Erik', 'Lotte', 'Heidi', 'Kaj',
      'Gerda', 'Anne', 'Britta', 'Magnus', 'Casper', 'Luka', 'Federico', 'Dona', 'Fabrizia', 'Lisa',
      'Benito', 'Franko', 'Alessandro', 'Leonora', 'Giuliana', 'Giovanni', 'Leonardo', 'Marta', 'Rosetta',
      'Romeo', 'Romina'
   ],
   'People',
   ''   
);
people.varAxisName = 'Variable #';
people.varAxisValues = people.varNames;
people.objAxisName = 'Person #';

/* Octane data */