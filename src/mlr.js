// *******************************************************
//    Classes and methods for general regression and MLR
// *******************************************************
//    written using ES6 

'strict mode';
/**
 * Returns a plot trace for bast line feet between first and second variable of a dataset
 * @param {Dataset} data Dataset with at least two variables
 */
function getBestFitLineTrace(data) {
   if (data.nVar < 2) {
      return undefined;
   }

   const x = data.values[0];
   const y = data.values[1];
   const n = x.length;
   const Sx = numeric.sum(x);
   const Sy = numeric.sum(y);
   const SSx = numeric.dot(x, numeric.transpose([x]));
   const SSxy = numeric.dot(x, numeric.transpose([y]));
   const b1 = (n * SSxy - Sx * Sy) / (n * SSx - Sx * Sx);
   const b0 = (Sy - Sx * b1) / n;

   const newX = [Math.min(...x), Math.max(...x)];
   const newY = [b0 + newX[0] * b1, b0 + newX[1] * b1];

   return {
      x: newX,
      y: newY,
      text: null,
      hoverinfo: 'none',      
      type: 'scatter',
      mode: 'lines',
      opacity: 0.5,
      line: {lineWidth: 1, dash: 'dot'}
   };
} 

/**
 * Class for storing and visualising regression results
 */
class RegRes {

   /**
    * Constructor for regression results object
    * @param {Dataset} yp  Dataset object with predicted response values
    * @param {Dataset} y Dataset object with reference response values (optional)
    */
    constructor(yp, y = null, name = null) {
      this.y = y;
      this.yp = yp;
      this.name = name;
      this.ncomp = yp.nVar;
      this.stat = RegRes.getStat(this.yp, this.y);
   }

   /**
    * Creates a plot with predictions
    * @param {HTMLDomObject} id ID of DOM object (div) to show the plot in
    * @param {Object} param JSON object with plot parameters (see Dataset.plot() method for details)
    */
   plotPredictions(id, param = {}) {
      if (!param.ncomp || param.ncomp < 1 || param.ncomp > this.ncomp) {
         param.ncomp = this.ncomp;
      }

      // if reference values exist make plot with predicted vs reference values. 
      // otherwise show predictions vs object number.
      let plotData;
      if (this.y) {
         plotData = new Dataset(
            [this.y.values[0], this.yp.values[param.ncomp - 1]],
            [this.yp.name + ', reference', this.yp.name + ', predicted'],
            this.yp.objNames,
            'Predictions',
            ''
         );
      } else {
         plotData = this.yp.subset([param.ncomp - 1], null);
      }

      // make plot (or get plot trace)
      let plot = plotData.plot(id, param);

      // make axes scale equal and add a best line fit if reference values exist
      if (this.y) {
         let lineTrace = getBestFitLineTrace(plotData);
         lineTrace.line.color = param.color;
         if (plot.layout != null) {
            const oldRange = plot.layout.xaxis.range.concat(plot.layout.yaxis.range);
            const newRange = [Math.min(...oldRange), Math.max(...oldRange)];
            Plotly.relayout(plot, {'xaxis.range': newRange, 'yaxis.range': newRange});   
            Plotly.addTraces(plot, lineTrace);
         } else {
            plot.push(lineTrace);
         }   
      }

      return plot;
   }

   /**
    * Creates a plot with residuals
    * @param {HTMLDomObject} id DOM object (div) to show the plot in
    * @param {Object} param JSON object with plot parameters (see Dataset.plot() method for details)
    */
   plotYResiduals(id, param = {}) {
      if (!param.ncomp || param.ncomp < 1 || param.ncomp > this.ncomp) {
         param.ncomp = this.ncomp;
      }

      // no reference y-values -> no residuals
      if (!this.y) return undefined;

      let plotData = new Dataset(
         [this.y.values[0], numeric.add(this.y.values[0], numeric.neg(this.yp.values[param.ncomp - 1]))],
         [this.yp.name + ', reference', 'Residuals'],
         this.yp.objNames,
         'Y-residuals',
         ''
      );

      let plot = plotData.plot(id, param);

      // make y-axis symmetric around 0
      if (plot.layout != null) {
         const oldRange = plot.layout.yaxis.range;
         const newRange = Math.max(...numeric.abs(oldRange));
         Plotly.relayout(plot, {'yaxis.range': [-newRange, newRange]});   
      }

      return plot;
   }

   /**
    * Creates a plot with RMSE values vs. number of components
    * @param {HTMLDomObject} id DOM object (div) to show the plot in
    * @param {Object} param JSON object with plot parameters (see Dataset.plot() method for details)
    */
   plotRMSE(id, param) {
      if (!this.stat.rmse) return undefined;
      return this.summary().subset('RMSE', null).plot(id, param);
   }

   /**
    * Calculates performance statistics for regression results
    * @param {Dataset} yp Dataset with predicted y-values
    * @param {Dataset} y Dataset with reference y-values (can be null)
    */
   static getStat(yp, y) {

      // if no reference values return empty JSON object
      if (y == null || y == undefined) return {};

      let nobj = y.nObj;
      let ncomp = yp.nVar;

      // total (full) y-variance
      let fullvar = Math.pow(rowSd(y.values)[0], 2) * (nobj - 1);

      // error of prediction
      let ymat = numeric.rep([ncomp], y.values[0]);
      let yerr = numeric.add(ymat, numeric.neg(yp.values));

      // residual variance
      let resvar = rowSum(numeric.pow(yerr, 2));

      // R2
      let r2 = numeric.add(1, numeric.neg(numeric.div(resvar, fullvar)));

      // RMSE
      let rmse = numeric.pow(numeric.div(resvar, nobj), 0.5);

      // Bias
      let bias = rowMean(yerr);

      return new Dataset(
         [bias, r2, rmse],
         ['Bias', 'R<sup>2</sup>', 'RMSE'],
         yp.varNames,
         'Performance statistics',
         ''
      );
   }
}

/**
 * Class for storing and visualising a regression model
 */
 class RegModel {

   /**
    * Constructor for regression results object
    * @param {Dataset} yp  Dataset object with predicted response values
    * @param {Dataset} y Dataset object with reference response values (optional)
    */
   constructor(param = {}) {
      // what can be changed in the model
      this.options = {
         autoscale: { 'none': 0, 'center only': 1, 'scale only': 2, 'center + scale': 3 },
      };

      // set autoscale parameter
      this.param = {};
      if (param.autoscale == null || param.autoscale == undefined) {
         this.param.autoscale = 1;
      } else {
         this.param.autoscale = param.autoscale;
      }

      // set ncomp parameter
      if (param.ncomp == null || param.ncomp == undefined) {
         this.param.ncomp = 1;
      } else {
         this.param.ncomp = param.ncomp;
      }

      // set cv parameter
      if (param.cv == null || param.cv == undefined) {
         this.param.cv = new Crossval();   
      } else {
         this.param.cv = param.cv; 
      }   

      // set values using for scale and center of data 
      this.xCenterValues = null;
      this.yCenterValues = null;
      this.xScaleValues = null;
      this.yScaleValues = null;
   }
   
   /**
    * Creates a plot with predicted values for all available results
    * @param {HTMLDomObject} id DOM object (div) to show the plot in
    * @param {Object} param JSON object with plot parameters (see Dataset.plot() method for details)
    */
   plotPredictions(id, param = {}) {
      const plot = this.calres.plotPredictions(id, modelPlotParam.calres(param));

      if (this.cvres != null) {
         Plotly.addTraces(plot, this.cvres.plotPredictions(null, modelPlotParam.cvres(param)));
         Plotly.relayout(plot, { showlegend: false });
      }

      return plot;
   }

   /** 
    * Creates a plot with y-residuals for all available results
    * @param {HTMLDomObject} id DOM object (div) to show the plot in
    * @param {Object} param JSON object with plot parameters (see Dataset.plot() method for details)
    */
   plotYResiduals(id, param = {}) {
      const plot = this.calres.plotYResiduals(id, modelPlotParam.calres(param));

      if (this.cvres != null) {
         Plotly.addTraces(plot, this.cvres.plotYResiduals(null, modelPlotParam.cvres(param)));
         Plotly.relayout(plot, { showlegend: false });
      }

      return plot;
   }

   /**
    * Creates a plot with regression coefficients
    * @param {HTMLDomObject} id DOM object (div) to show the plot in
    * @param {Object} param JSON object with plot parameters (see Dataset.plot() method for details)
    */
   plotRegcoeffs(id, param = {}) {

      if (!this.coeffs) return undefined;

      if (!param.ncomp || param.ncomp < 1 || param.ncomp > this.param.ncomp) {
         param.ncomp = this.param.ncomp;
      }

      if (!param.type) {
         if (this.coeffs.nObj <= 10) {
            param.type = 'h';
         } else {
            param.type = 'l';
         }
      }

      return this.coeffs.subset([param.ncomp - 1], null).plot(id, param);
   }

   /**
    * Calibrates a regression model 
    * @param {Dataset} x Dataset object with predictors
    * @param {Dataset} y Dataset object with responses 
    */
   calibrate(x, y) {

      // generate vector with mean values for centering (or null if no centering is needed)
      if (parseInt(this.param.autoscale) == 1 || parseInt(this.param.autoscale) == 3) {
         this.xCenterValues = rowMean(x.values);
         this.yCenterValues = rowMean(y.values);
      } else {
         this.xCenterValues = null;
         this.yCenterValues = null;
      }

      // generate vector with std values for scaling (or null if no scaling is needed)
      if (parseInt(this.param.autoscale) == 2 || parseInt(this.param.autoscale) == 3) {
         this.xScaleValues = rowSd(x.values);
         this.yScaleValues = rowSd(y.values);
      } else {
         this.xScaleValues = null;
         this.yScaleValues = null;
      }

      // autoscale the data values
      var xValues = autoscale(x.values, this.xCenterValues, this.xScaleValues);
      var yValues = autoscale(y.values, this.yCenterValues, this.yScaleValues);

      // compute regression coefficients and convert the values to Dataset object
      this.coeffs = new Dataset(
         this.getRegCoeffs(xValues, yValues),
         ['Coefficients'],
         x.varNames,
         'Regression coefficients',
         '',
         'Components',
         null,
         x.varAxisName,
         x.varAxisValues
      );

      // get predictions for calibration set
      this.calres = this.predict(x, y);

      // do cross-validation if necessary
      if (this.param.cv != null) {
         this.cvres = this.crossval(x, y);
      }
   }

   /**
    * Applies a linear regression model to a new dataset
    * @param {Dataset} x Dataset object with responses
    * @param {Dataset} y Dataset object with responses (optional)
    */
   predict(x, y = null) {

      //get predicted y-values and convert them to Dataset object
      let yp = new Dataset(this.getPredictedValues(x));

      // set up names and other properties for predicted values
      if (y == undefined || y == null) {
         yp.varNames = rep(1, this.param.ncomp).map(function (x, i) { return 'Comp ' + (i + 1); });
         yp.objNames = this.calres.y.objNames;
         yp.varAxisName = this.calres.y.varAxisName;
         yp.varAxisValues = this.calres.y.varAxisValues;
         yp.name = this.calres.y.varNames[0];
      } else {
         yp.varNames = rep(1, this.param.ncomp).map(function (x, i) { return 'Comp ' + (i + 1); });
         yp.objNames = y.objNames;
         yp.varAxisName = y.varAxisName;
         yp.objAxisName = y.objAxisName;
         yp.varAxisValues = y.varAxisValues;
         yp.objAxisValues = y.objAxisValues;
         yp.name = y.varNames[0];
      }

      // create MLR result object
      return yp;
   }
}

/** 
 * Class for Multiple Linear Regression model 
 */
class MLRModel extends RegModel {
   constructor(param = {}) {
      // number of components for MLR model is always 1
      param.ncomp = 1;
      super(param);
   }

   /**
    * Returns array with predicted y-values
    * @param {Dataset} x Dataset with predictors (x-values)
    */
   getPredictedValues(x) {
      // autoscale the x-values
      let xValues = autoscale(x.values, this.xCenterValues, this.xScaleValues);

      // make predictions
      let yp = numeric.dot(this.coeffs.values, xValues);

      // unscale if necessary
      if (this.yScaleValues) {
         yp = autoscale(yp, null, numeric.div(1, this.yScaleValues));
      }

      // uncenter if necessary
      if (this.yCenterValues) {
         yp = autoscale(yp, numeric.neg(this.yCenterValues), null);
      }

      return yp;
   }

   /**  
    * Computes and return a vector with regression coefficients for MLR model
    */
   getRegCoeffs(x, y) {
      return numeric.transpose(
         numeric.dot(
            numeric.inv(numeric.dot(x, numeric.transpose(x))),
            numeric.dot(x, numeric.transpose(y))
         )
      );
   }

   /**
    * Cross-validation of MLR model
    * @param {Dataset} x x-values as Dataset object
    * @param {Dataset} y y-values as Dataset object
    */
   crossval(x, y) {
      if (this.param.cv.method == 'none') {
         return null;
      }

      let nObj = y.nObj;
      this.param.cv.computeIndices(nObj, y);

      if (this.param.cv.indices == null) {
         return null;
      }


      let param = Object.assign({}, this.param);
      param.cv.method = 'none';

      let m = new MLRModel(param);
      let ypCV = 0;
      for (let rep = 0; rep < this.param.cv.nrep; rep++) {
         let ypLoc = new Array(nObj);
         for (let seg = 0; seg < this.param.cv.nseg; seg++) {
            const xc = x.subset(null, this.param.cv.indices[rep][seg].cal);
            const yc = y.subset(null, this.param.cv.indices[rep][seg].cal);
            const xt = x.subset(null, this.param.cv.indices[rep][seg].val);

            m.calibrate(xc, yc);
            const yp = m.getPredictedValues(xt);
            for (const [num, ind] of this.param.cv.indices[rep][seg].val.entries()) {
               ypLoc[ind] = yp[0][num];
            }
         }
         ypCV = numeric.add(ypCV, ypLoc);
      }

      ypCV = numeric.div(ypCV, this.param.cv.nrep);
      ypCV = new Dataset(ypCV);

      ypCV.varNames = rep(1, this.param.ncomp).map(function (x, i) { return 'Comp ' + (i + 1); });
      ypCV.objNames = y.objNames;
      ypCV.varAxisName = y.varAxisName;
      ypCV.objAxisName = y.objAxisName;
      ypCV.varAxisValues = y.varAxisValues;
      ypCV.objAxisValues = y.objAxisValues;
      ypCV.name = y.varNames[0];

      return new RegRes(ypCV, y, 'CV');
   }

   predict(x, y) {
      let yp = super.predict(x, y);
      return new MLRRes(yp, y);
   }

   /**
    * Returns Dataset with performance summary with all results available
    */
   summary() {
      let out = this.calres.stat;      
      if (this.cvres != null) {
         out = out.rbind(this.cvres.stat);
         out.objNames = ['Cal', 'CV'];
      } else {
         out.objNames = ['Cal'];
      }
      return out;
   }
}

/** 
 * Class for Multiple Linear Regression results 
 */
class MLRRes extends RegRes {
   constructor(yp, y, name) {
      super(yp, y, name);
   }
}

/** 
 * Interactive 3D application for MLR
 */
class MLR3DApp {
   constructor(data = people, varset = { X1: 'Height', X2: 'IQ', y: 'Weight' }) {
      this.data = data;             // dataset
      this.varset = varset;         // selected variables (X1, X2, y)
      this.model = new MLRModel();  // current MLR model
      this.cv = null;               // choice for cross-validation
      this.ycv = rep(undefined, this.data.nRows);  // vector with cross-validated predictions from step-by-step cv

      // sort data rows
      this.data.sort(this.varset.y);

      // parameters for cross-validation
      this.cvOptions = { 'none': 0, 'full': 1, 'rand 8 seg': 2, 'rand 4 seg': 3, 'ven 8 seg': 4, 'ven 4 seg': 5};

      // index and values for selected data point (object)
      this.selection = {
         n: 0,
         X1: this.data.subset(varset.X1).values[0][0],
         X2: this.data.subset(varset.X2).values[0][0],
         y: this.data.subset(varset.y).values[0][0],
      };

      // define main DOM elements
      this.gui = {
         dom: {
            tablePane: document.getElementById('tablePane'),
            helpPane: document.getElementById('helpDialog'),
            plotPane: document.getElementById('mainPlotPane'),
            infoPane: document.getElementById('infoPane'),
            dataSettingsPane: document.getElementById('dataSettingsPane'),
            varsetSettingsPane: document.getElementById('varsetSettingsPane'),
            selectedObjectSettingsPane: document.getElementById('selectedObjectSettingsPane'),
         },
         settings: {
            selectedObject: null,
            model: null
         }
      };

      // process keypress events for showing help and table
      window.addEventListener("keydown", (e) => {
         const elHelp = this.gui.dom.helpPane;
         const elMat = this.gui.dom.tablePane;
         const elPlot = this.gui.dom.plotPane;
         switch (e.key) {
            case 'ArrowUp':
               // select object from next row
               this.select('--');
               break;
            case 'ArrowDown':
               // select object from previous row
               this.select('++');
               break;
            case 'h':
               // show/hide window with help text
               elHelp.style.display = (elHelp.style.display == 'none' || !elHelp.style.display) ? 'block' : 'none';
               break;
            case 't':
               // show/hide window with numeric data
               if (elMat.style.display == 'none' || !elMat.style.display) {
                  elPlot.style.display = 'none';
                  elMat.style.display = 'block';
               } else {
                  elPlot.style.display = 'block';
                  elMat.style.display = 'none';
                  resizePlot(elPlot);
               }
               break;
         }
      });

      // setup panel with options for dataset and visualisation
      let el1 = this.gui.dom.dataSettingsPane;
      if (el1) {
         this.gui.settings.model = new dat.GUI({ autoplace: false, width: '100%' });
         this.gui.settings.model
            .add(this.model.param, 'autoscale', this.model.options.autoscale)
            .onChange(() => {
               this.updateAll();
            });
         this.gui.settings.model
            .add(this, 'cv', this.cvOptions)
            .onChange((value) => {
               this.updateAll();
            });
         this.gui.settings.model
            .add(this, 'crossvalidate')
            .name('cv step by step');
         el1.appendChild(this.gui.settings.model.domElement);
      }

      // set up control panel for selecting variables
      let el2 = this.gui.dom.varsetSettingsPane;
      if (el2) {
         this.gui.settings.varset = new dat.GUI({ autoplace: false, width: '100%' });
         this.gui.settings.varset
            .add(this.varset, 'X1', this.data.varNames)
            .onFinishChange(() => {
               this.updateVarset(0);               
            });
         this.gui.settings.varset
            .add(this.varset, 'X2', this.data.varNames)
            .onFinishChange(() => {
               this.updateVarset(1);
            });
         this.gui.settings.varset
            .add(this.varset, 'y', this.data.varNames)
            .onFinishChange(() => {
               this.updateVarset(2);
            });
         el2.appendChild(this.gui.settings.varset.domElement);
      }

      // set up and show settings pane for selected object
      let el3 = this.gui.dom.selectedObjectSettingsPane;
      if (el3) {
         const subset = this.data.subset(Object.values(this.varset));
         const mn = rowMin(subset.values);
         const mx = rowMax(subset.values);
         const df = numeric.div(numeric.add(mx, numeric.neg(mn)), 10);
         this.gui.settings.selectedObject = new dat.GUI({ autoplace: false, width: '100%' });
         this.gui.settings.selectedObject
            .add(this.selection, 'X1', mn[0] - df[0], mx[0] + df[0])
            .name(this.varset.X1)
            .listen()
            .onFinishChange(() => {
               this.updateAll('X1');
            });
         this.gui.settings.selectedObject
            .add(this.selection, 'X2', mn[1] - df[1], mx[1] + df[1])
            .name(this.varset.X2)
            .listen()
            .onFinishChange(() => {
               this.updateAll('X2');
            });
         this.gui.settings.selectedObject
            .add(this.selection, 'y', mn[2] - df[2], mx[2] + df[2])
            .name(this.varset.y)
            .listen()
            .onFinishChange(() => {
               this.updateAll('y');
            });
         el3.appendChild(this.gui.settings.selectedObject.domElement);         
      }

      this.computePlotData();
      this.plot();
      this.updateInfo();   
      this.select(0);       
   }

   /**
    * Updates control elements when variables are changed
    * @param {Numeric} varNum which variable is changed (X1, X2 or y) 
    * @param {*} value new value for the variable
   */
   updateVarset(varNum, value) {
      if (varNum < 0 || varNum > 2) return undefined;

      // get name and values for the selected variable
      const varName = Object.keys(this.varset)[varNum];
      
      // resort data values if y-variable was changed
      if (varNum == 2) {
         this.data.sort(this.varset.y);
      }
      
      // get the values
      const varValues = this.data.subset(this.varset[varName]).values[0];

      // change varable value for selected object
      this.selection[varName] = varValues[this.selection.n];

      // change limits for the selected variable
      if (this.gui.settings.selectedObject.__controllers[varNum]) {
         
         // calculate limits for the variable
         const mn = Math.min(...varValues);
         const mx = Math.max(...varValues);
         const df = (mx - mn) / 10;

         // change properties of DAT.GUI element for selected object and variable
         this.gui.settings.selectedObject.__controllers[varNum].name(this.varset[varName]);
         this.gui.settings.selectedObject.__controllers[varNum].__min = mn - df;
         this.gui.settings.selectedObject.__controllers[varNum].__max = mx + df;
         this.gui.settings.selectedObject.__controllers[varNum].updateDisplay();
      }

      this.updateAll();
   }

   /**
    * Updates table with numerical values
    */
   updateTable(ind = [], coeffs = null) {
      var obj = this.gui.dom.tablePane.childNodes[0];
      if (obj) {
         const n = this.selection.n;

         // data set for original values
         let dataRaw = this.data.subset(Object.values(this.varset));
         dataRaw = dataRaw.rbind(dataRaw.mean());
         dataRaw.varNames = ['X1', 'X2', 'y'];

         // dataset for scaled values
         let dataScaled = new Dataset([this.xValues[0], this.xValues[1], this.yValues[0]], ["X1'", "X2'", "y'"]);
         dataScaled = dataScaled.rbind(dataScaled.mean());

         // dataset for predictions
         let ycv;
         if (ind.length > 0) {
            ycv = this.ycv;
         } else {
            coeffs = this.model.coeffs;
            if (this.model.cvres == null) {
               ycv = rep(undefined, this.data.nObj);   
            }  else {
               ycv = this.model.cvres.yp.values[0];
            }  
         }

         let pred = new Dataset(
            [
               this.yPredValues[0], 
               this.model.calres.yp.values[0],
               ycv
            ], 
            ["yp'", "yp", "ycv"]
         );

         pred = pred.rbind(pred.mean());

         // dataset for residuals
         let ecv = rep(undefined, this.data.nObj);
         let y = dataRaw.subset('y').values[0];
         for (let i = 0; i < this.data.nObj; i++) {
            if (ycv[i] != undefined) {
               ecv[i] = y[i] - ycv[i]; 
            }
         }

         let res = new Dataset(
            [
               numeric.add(this.yValues[0], numeric.neg(this.yPredValues[0])),
               numeric.add(y, numeric.neg(this.model.calres.yp.values[0])),
               ecv
            ],
            ["e'", "e", "ecv"]
         );
         res = res.rbind(res.mean());

         obj.innerHTML = '' +
            '<div><h2>Data, raw</h2>' + dataRaw.asTable({ showObjNames: true, current: n, selected: ind }) + '</div>' + 
            '<div><h2>Data, autoscaled</h2>' + dataScaled.asTable({ showObjNames: false, current: n, selected: ind }) + '</div>' + 
            '<div><h2>Predictions</h2>' + pred.asTable({ showObjNames: false, current: n, selected: ind }) + '</div>' + 
            '<div><h2>Residuals</h2>' + res.asTable({ showObjNames: false, current: n, selected: ind }) + '</div>' + 
            '<div><h2>Coeffs</h2>' + coeffs.asTable({ showObjNames: true, dec: 3, class:"coeffs" }) + '</div>';
      }
   }

   /** 
    * Shows info about the model and variables mean values
    */
    updateInfo() {
      var obj = this.gui.dom.infoPane;
      if (obj) {
         obj.innerHTML = '' + 
         '<div class="info">' + 
         this.model.summary().t().asTable({showObjNames: true, dec: 3}) + 
         '</div>';
      }
   }

   /** 
    * Updates plots if values or parameters have been changed 
    * @param {boolean} variableChanged name of variable that has been changed for selected object
    */
   updateAll(variableChanged) {

      // number of current selected object
      const nObj = this.selection.n;

      // update dataset if values for selected object were changed
      if (variableChanged) {
         let nVar = this.data.varNames.indexOf(this.varset[variableChanged]);
         this.data.values[nVar][nObj] = this.selection[variableChanged];
      }

      // recompute the model and PC plane
      this.computePlotData();

      // prepare plot trace for the updated data and model
      const updatePlots = {
         text:  [this.data.objNames, this.data.objNames, null, null, null, null, null, null, null],
         x: [
            this.xValues[0],  // data values
            this.xValues[0],  // predictions
            [], [],           // cross-validation
            this.xValues[0][nObj], // selection
            this.xValues[0][nObj], // selection predictions
            [this.xValues[0][nObj], this.xValues[0][nObj]], // residuals
            this.plane[0], // plane
         ],
         y: [
            this.xValues[1], // data values
            this.xValues[1], // predictions
            [], [],           // cross-validation
            this.xValues[1][nObj], // selection
            this.xValues[1][nObj], // selection predictions
            [this.xValues[1][nObj], this.xValues[1][nObj]], // residuals
            this.plane[1], // plane
         ],
         z: [
            this.yValues[0], // data values
            this.yPredValues[0], // predictions
            [], [],           // cross-validation
            this.yValues[0][nObj], // selection
            this.yPredValues[0][nObj], // selection preditions
            [this.yValues[0][nObj], this.yPredValues[0][nObj]], // residuals
            this.plane[2], // plane
         ],
      };

      // update names for axes
      var updateLayout = {
         scene: {
            xaxis: { title: this.varset.X1 },
            yaxis: { title: this.varset.X2 },
            zaxis: { title: this.varset.y },
         }
      };

      // show the updated plots (both for 3D and model)
      if (this.gui.dom.plotPane != null) {
         Plotly.restyle(this.gui.dom.plotPane, updatePlots, [0, 1, 2, 3, 4, 5, 6, 7]);
         Plotly.relayout(this.gui.dom.plotPane, updateLayout);
         
         this.updateInfo();
         this.select(nObj);
      }
   }

   crossvalidate() {
      if (this.cv == null ||  this.cv == 0) {
         return undefined;
      }

      function nextStep(j, obj, y, yp) {
         if (j == obj.model.param.cv.nseg) {
            obj.updateAll();
            document.getElementById('optionsPane').style.display = 'block';
            document.getElementById('cvInfoPane').style.display = 'none';
            return;
         }

         if (j == 0) {
            obj.ycv = rep(undefined, obj.data.nObj);
            document.getElementById('cvNumSeg').innerHTML = obj.model.param.cv.nseg;
            document.getElementById('cvNumObj').innerHTML = obj.data.nObj;
            document.getElementById('cvCurSeg').innerHTML = 1;
            document.getElementById('optionsPane').style.display = 'none';
            document.getElementById('cvInfoPane').style.display = 'block';
         }

         setTimeout(() => {
            const cind = obj.model.param.cv.indices[0][j].cal;
            const vind = obj.model.param.cv.indices[0][j].val;
            document.getElementById('cvCurSeg').innerHTML =
               '<span style="color:red">' + (j + 1) + '</span>' +
               ' (' + vind.length + ' object' + (vind.length > 1 ? 's' : '') + ')';

            // calibrate MLR model and compute coordinates of projected points
            let m = new MLRModel();
            m.param.autoscale = obj.model.param.autoscale;
            let xc = obj.data.subset([obj.varset.X1, obj.varset.X2], cind);
            let yc = obj.data.subset([obj.varset.y], cind);
            m.calibrate(xc, yc);

            // autoscale values and compute predictions for calibration subset
            let xCalValues = autoscale(xc.values, m.xCenterValues, m.xScaleValues);
            let yCalValues = autoscale(yc.values, m.yCenterValues, m.yScaleValues);
            let yCalPredValues = numeric.dot(obj.model.coeffs.values, xCalValues);

            // autoscale values and compute predictions for calibration subset
            let xv = obj.data.subset([obj.varset.X1, obj.varset.X2], vind);
            let yv = obj.data.subset([obj.varset.y], vind);
            let xValValues = autoscale(xv.values, m.xCenterValues, m.xScaleValues);
            let yValValues = autoscale(yv.values, m.yCenterValues, m.yScaleValues);
            let yValPredValues = numeric.dot(obj.model.coeffs.values, xValValues);
            let yValPred = m.predict(xv).yp.values[0];

            // combine y and yp values with ones from previous steps
            y = y.concat(yv.values[0]);
            yp = yp.concat(yValPred);

            // compute evenly spread coordinates to show model as a plane
            let n = 10;
            let maxX = rowMax(numeric.abs(obj.xValues));
            let X1 = [-maxX[0], 0, maxX[0], -maxX[0], 0, maxX[0], -maxX[0], 0, maxX[0]];
            let X2 = [-maxX[1], -maxX[1], -maxX[1], 0, 0, 0, maxX[1], maxX[1], maxX[1]];
            obj.plane = [X1, X2, numeric.dot(obj.model.coeffs.values, [X1, X2])[0]];

            // prepare plot trace for the updated data and model
            const update = {
               x: [
                  xCalValues[0], // cal data values
                  xCalValues[0], // cal predictions
                  xValValues[0], // val data values
                  xValValues[0], // val predictions
                  [], [], [],    // selection
                  obj.plane[0], // plane
               ],
               y: [
                  xCalValues[1], // cal data values
                  xCalValues[1], // cal predictions
                  xValValues[1], // val data values
                  xValValues[1], // val predictions
                  [], [], [],    // selection
                  obj.plane[1], // plane
               ],
               z: [
                  yCalValues[0], // cal data values
                  yCalPredValues[0], // cal predictions
                  yValValues[0], // val data values
                  yValPredValues[0], // val predictions
                  [], [], [],    // selection
                  obj.plane[3], // plane
               ],
            };

            // update main plot
            Plotly.restyle(obj.gui.dom.plotPane, update, [0, 1, 2, 3, 4, 5, 6, 7]);

            // get parameters for CV result plot
            const param = modelPlotParam.cvres();

            // new plot for predictions
            let p1 = obj.model.calres.plotPredictions(
               document.getElementById('predictionsPlot'),
               modelPlotParam.calres({ opacity: 0.5})
            );

            Plotly.addTraces(p1, [
               {
                  type: 'scatter',
                  mode: 'markers',
                  x: y,
                  y: yp,
                  opacity: 0.75,
                  marker: { 
                     color: param.color, 
                     size: param.markerSize, 
                     symbol: param.markerSymbol
                  }
               },
               {
                  type: 'scatter',
                  mode: 'markers',
                  opacity: 1,
                  x: yv.values[0],
                  y: yValPred,
                  marker: { 
                     color: param.currentColor, 
                     size: param.currentMarkerSize, 
                     symbol: param.markerSymbol 
                  }
               }
            ]);

            // new plot for residuals
            let p2 = obj.model.calres.plotYResiduals(
               document.getElementById('residualsPlot'),
               modelPlotParam.calres({opacity: 0.5})
            );

            Plotly.addTraces(p2, [
               {
                  type: 'scatter',
                  mode: 'markers',
                  opacity: 0.75,
                  x: y,
                  y: numeric.add(y, numeric.neg(yp)),
                  marker: { 
                     color: param.color, 
                     size: param.markerSize, 
                     symbol: param.markerSymbol
                  }
               },
               {                  
                  type: 'scatter',
                  mode: 'markers',
                  opacity: 1,
                  x: yv.values[0],
                  y: numeric.add(yv.values[0], numeric.neg(yValPred)),
                  marker: { 
                     color: param.currentColor, 
                     size: param.currentMarkerSize, 
                     symbol: param.markerSymbol 
                  }
               }
            ]);

            // new plot for regression coefficients
            let p3 = obj.model.plotRegcoeffs(
               document.getElementById('regcoeffsPlot'),
               { showLabels: true, markerSize: 6 }
            );

            Plotly.addTraces(p3, {
               type: 'bar',
               x: m.coeffs.objAxisValues,
               y: m.coeffs.values[0],
               marker: { color: '#f31414' },
            });

            for (let i = 0; i < vind.length; i++) {
               obj.ycv[vind[i]] = yValPred[i];
            }
            obj.updateTable(vind, m.coeffs);

            nextStep(++j, obj, y, yp);
         }, 2000);

      }

      nextStep(0, this, [], []);
   }

   /**
    * Computes model and data for 3D plot
    */
   computePlotData() {

      // define cross-validation parameters for MLR model
      if (this.cv == 1) {
         this.model.param.cv.method = 'full';
      } else if (this.cv == 2) {
         this.model.param.cv.method = 'rand';
         this.model.param.cv.nseg = 8;
      } else if (this.cv == 3) {
         this.model.param.cv.method = 'rand';
         this.model.param.cv.nseg = 4;
      } else if (this.cv == 4) {
         this.model.param.cv.method = 'ven';
         this.model.param.cv.nseg = 8;
      } else if (this.cv == 5) {
         this.model.param.cv.method = 'ven';
         this.model.param.cv.nseg = 4;
      } else {
         this.model.param.cv.method = 'none';
      }

      // calibrate MLR model and compute coordinates of projected points
      let x = this.data.subset([this.varset.X1, this.varset.X2]);
      let y = this.data.subset([this.varset.y]);
      this.model.calibrate(x, y);

      // autoscale values and compute predictions for 3D plot
      this.xValues = autoscale(x.values, this.model.xCenterValues, this.model.xScaleValues);
      this.yValues = autoscale(y.values, this.model.yCenterValues, this.model.yScaleValues);
      this.yPredValues = numeric.dot(this.model.coeffs.values, this.xValues);

      // compute evenly spread coordinates to show model as a plane
      let n = 10;
      let maxX = rowMax(numeric.abs(this.xValues));
      let X1 = [-maxX[0], 0, maxX[0], -maxX[0], 0, maxX[0], -maxX[0], 0, maxX[0]];
      let X2 = [-maxX[1], -maxX[1], -maxX[1], 0, 0, 0, maxX[1], maxX[1], maxX[1]];
      this.plane = [X1, X2, numeric.dot(this.model.coeffs.values, [X1, X2])[0]];
   }

   /**
    * Method called when a new object is selected
    */
   select(value) {
      var n = this.selection.n;
      if (typeof (value) == 'string') {
         if (value == '++') {
            n = n + 1;
            if (n >= this.data.nObj) {
               n = 0;
            }
         } else if (value == '--') {
            n = n - 1;
            if (n < 0) {
               n = this.data.nObj;
            }
         }
      } else {
         n = value;
      }

      if (n == null || n < 0 || n >= this.data.nObj) {
         n = 0;
      }

      const subset = this.data.subset(Object.values(this.varset));
      this.selection.n = n;
      this.selection.X1 = subset.values[0][n];
      this.selection.X2 = subset.values[1][n];
      this.selection.y  = subset.values[2][n];

      var update = {
         x: [[this.xValues[0][n]], [this.xValues[0][n]], [this.xValues[0][n], this.xValues[0][n]]],
         y: [[this.xValues[1][n]], [this.xValues[1][n]], [this.xValues[1][n], this.xValues[1][n]]],
         z: [[this.yValues[0][n]], [this.yPredValues[0][n]], [this.yValues[0][n], this.yPredValues[0][n]]],
      };

      Plotly.restyle(this.gui.dom.plotPane, update, null, [4, 5, 6]);
      this.plotModel();
      this.updateTable();   
   }

   /** 
    * Resizes plots if splitters have been moved
    */
   resizePlots() {
      window.dispatchEvent(new Event('resize'));
   }

   /** 
    * Create a 3D plot with data and PCA model
    */
   plot() {
      const layout = {
         autorange: true,
         showlegend: false,
         hovermode: 'closest',
         title: '',
         margin: { l: 30, r: 30, b: 30, t: 0 },
         scene: {
            xaxis: { title: this.varset.X1 },
            yaxis: { title: this.varset.X2 },
            zaxis: { title: this.varset.y },
         }
      };

      const calDataTrace = {
         opacity: 0.75,
         size: 0.5,
         hoverinfo: 'text',
         text: this.data.objNames,
         type: 'scatter3d',
         x: this.xValues[0],
         y: this.xValues[1],
         z: this.yValues[0],
         mode: 'markers',
         marker: {
            size: 6,
            color: 'dodgerblue'
         }
      };

      const calProjectionsTrace = {
         opacity: 1,
         size: 0.5,
         type: 'scatter3d',
         hoverinfo: 'text',
         text: this.data.objNames,
         x: this.xValues[0],
         y: this.xValues[1],
         z: this.yPredValues[0],
         mode: 'markers',
         marker: {
            size: 4,
            color: 'dodgerblue'
         }
      };

      const valDataTrace = {
         opacity: 0.75,
         size: 0.5,
         hoverinfo: 'text',
         text: this.data.objNames,
         type: 'scatter3d',
         x: [],
         y: [],
         z: [],
         mode: 'markers',
         marker: {
            size: 6,
            color: '#f31414'
         }
      };

      const valProjectionsTrace = {
         opacity: 1,
         size: 0.5,
         type: 'scatter3d',
         hoverinfo: 'text',
         text: this.data.objNames,
         x: [],
         y: [],
         z: [],
         mode: 'markers',
         marker: {
            size: 5,
            color: '#f31414'
         }
      };

      const modelPlaneTrace = {
         x: this.plane[0],
         y: this.plane[1],
         z: this.plane[2],
         hoverinfo: 'none',
         opacity: 0.25,
         type: 'mesh3d',
         color: 'yellow',
      };

      const selDataTrace = {
         opacity: 1,
         size: 0.5,
         type: 'scatter3d',
         hoverinfo: 'text',
         text: this.data.objNames,
         x: this.xValues[0][0],
         y: this.xValues[1][0],
         z: this.yValues[0][0],
         mode: 'markers',
         marker: {
            size: 8,
            color: '#1564b2'
         }
      };

      const selProjectionsTrace = {
         opacity: 1,
         size: 0.5,
         type: 'scatter3d',
         hoverinfo: 'text',
         text: this.data.objNames,
         x: this.xValues[0][0],
         y: this.xValues[1][0],
         z: this.yPredValues[0][0],
         mode: 'markers',
         marker: {
            size: 6,
            color: '#1564b2'
         }
      };

      const selDistanceTrace = {
         x: [this.xValues[0][0], this.xValues[0][0]],
         y: [this.xValues[1][0], this.xValues[1][0]],
         z: [this.yValues[0][0], this.yPredValues[0][0]],
         hoverinfo: 'text',
         text: ['difference between y and yp'],
         type: 'scatter3d',
         mode: 'lines',
         marker: {
            color: '#1564b2',
         },
         opacity: 0.9
      };

      Plotly.newPlot(
         this.gui.dom.plotPane,
         [
            calDataTrace, calProjectionsTrace,
            valDataTrace, valProjectionsTrace,
            selDataTrace, selProjectionsTrace, selDistanceTrace,
            modelPlaneTrace,
         ],
         layout,
         { displayModeBar: false }
      );

      /* 
      // this does not work so far because of the following bug in plotly
      // https://github.com/plotly/plotly.js/issues/1025
      this.gui.dom.plotPane.on('plotly_click', function(data){
         n = data.points[0].pointNumber;
      });
      */

      if (this.gui.dom.plotPane != null) {
         var plotPane = this.gui.dom.plotPane;
         window.addEventListener('resize', function () { resizePlot(plotPane); });
      }

   }

   /** 
    * show 2D plots for current MLR model
    */
   plotModel() {
      let nObj = this.selection.n;
      let p1 = this.model.plotPredictions(
         document.getElementById('predictionsPlot'),
         { showLabels: true, markerSize: 6, current: nObj }
      );
      p1.on('plotly_click', (data) => {
         this.select(data.points[0].pointNumber);
      });      

      let p2 = this.model.plotYResiduals(
         document.getElementById('residualsPlot'),
         { showLabels: true, markerSize: 6, current: nObj }
      );
      p2.on('plotly_click', (data) => {
         this.select(data.points[0].pointNumber);
      });      

      this.model.plotRegcoeffs(
         document.getElementById('regcoeffsPlot'),
         { showLabels: true, markerSize: 6 }
      );
   } 
}

/** Generates a sequence of objects for cross-validation
 * 
 */
class Crossval {

   constructor(method = 'none', nseg = 10, nrep = 1) {

      this.method = method;
      this.nseg = nseg;
      this.nrep = nrep;

      if (this.method == 'full') {
         this.nrep = 1;
      }

      this.indices = null;
   }

   computeIndices(nObj = null, y = null) {
      if (this.method == 'none') {
         return;
      }

      if (nObj == null) {
         throw ('crossval: number of objects is not defined!');
      }

      if (this.method == 'ven' && y == null) {
         throw ('crossval: vector with y-values is required for venetian blinds!');
      }

      // correct numbet of segments for full cross-validation
      if (this.method == 'full') {
         this.nseg = nObj;
      }

      // no repetition for venetian blinds and full cross-validation
      if (this.method == 'ven' || this.method == 'full') {
         this.nrep = 1;
      }

      // limit number of repetitions
      if (this.nrep < 1 || this.nrep > 20) {
         this.nrep = 1;
      }

      let nSeg = this.nseg;
      let nRep = this.nrep;
      let method = this.method;
      if (method == 'full') {
         method = 'rand';
      }

      let s = [];
      let nSegObj = Math.round(nObj / nSeg);
      if (method == 'rand') {
         // generate indices as random numbers
         s = shuffle(seq(0, nObj - 1));
      } else if (method == 'ven') {
         // get indices for sorted y-values
         let ind = sort(y.values[0]);
         let f = function(v, i) { return i % nSeg == 0 ||  i == 0; };
         for (let k = 0; k < nSeg; k++) {
            s = s.concat(ind.filter(f));
            ind.shift();
         } 
      } else {
         throw ('crossval: wrong method name!');
      }

      let out = new Array(nRep);
      for (let i = 0; i < nRep; i++) {
         out[i] = new Array(nSeg);
         for (let j = 0; j < nSeg - 1; j++) {
            out[i][j] = {
               cal: s.slice(0, j * nSegObj).concat(s.slice((j + 1) * nSegObj)),
               val: s.slice(j * nSegObj, (j + 1) * nSegObj)
            };
         }
         let j = nSeg - 1;
         out[i][j] = {
            cal: s.slice(0, j * nSegObj).concat(s.slice((j + 1) * nSegObj)),
            val: s.slice(j * nSegObj)
         };
      }

      this.indices = out;
   }
}