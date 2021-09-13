// **********************************
//    Classes and methods for PCA
// **********************************
//    written using ES6

'strict mode';

/**
 * Class for storing and visualising liner decomposition results
 */
class LDecomp {
   /**
    *
    * @param {Dataset} scores Dataset with scores
    * @param {Dataset} T2  Dataset with Score distances
    * @param {Dataset} Q  Dataset with Orthogonal distances
    * @param {Dataset} variance
    * @param {string} info
    */
   constructor (scores, T2, Q, variance, info) {
      this.scores = scores;
      this.T2 = T2;
      this.Q = Q;
      this.variance = variance;
      this.ncomp = scores.nVar;
      this.info = info;
   }

   plotScores (id, comp, param) {
      if (!comp) {
         if (this.scores.nVar > 1) {
            comp = ['Comp 1', 'Comp 2'];
         } else {
            comp = ['Comp 1'];
         }
      }
      return this.scores.subset(comp).plot(id, param);
   }

   plotDistance (id, ncomp = 1, param = {}) {

      let h = this.T2.values[ncomp - 1]
      let q = this.Q.values[ncomp - 1]
      let h0 = mean(h)
      let q0 = mean(q)

      const plotData = new Dataset(
         [h.map(x => x/h0), q.map(x => x/q0)],
         ['Score distance, h/h0', 'Orthogonal distance, q/q0'],
         this.T2.objNames,
         'Distance plot'
      );

      return plotData.plot(id, param);
   }

   plotVariance (id, variance = 'Individual', param = {}) {
      if (!param.type || param.type == 'p') {
         param.type = 'h';
      }

      let plotData = this.variance.subset([variance]);
      plotData.name = variance + ' explained variance';
      plotData.varNames[0] = 'Variance, %';
      plotData.varAxisValues = plotData.varNames;
      return plotData.plot(id, param);
   }
}

class PCARes extends LDecomp {
   constructor(scores, T2, Q, variance, info) {
      super(scores, T2, Q, variance, info);
   }
}

/**
 * Class for a PCA (and similar) model
 * @param {Numeric} ncomp - number of components
 */
class PCAModel {

   constructor () {
      // what can be changed in the model
      this.options = {
         methods: { 'PCA': 0 },
         autoscale: { 'none': 0, 'center only': 1, 'scale only': 2, 'center + scale': 3 },
      };

      // currently selected parameters
      this.param = {
         ncomp: 1,               // number of components to compute
         method: 0,                 // choice for method
         autoscale: 3,              // choice for autoscaling
      };

      /* values using for scale and center of data */
      this.centerValues = null;
      this.scaleValues = null;
      this.tnorm = null;
   }

   /**
    * Compute loadings using the selected method
    * @param {Array} data Numeric 2D array with data after preprocessing
    */
   calibrate (data, ncomp) {
      // generate vector with mean values for centering (or null if no centering is needed)
      if (this.param.autoscale == 1 || this.param.autoscale == 3) {
         this.centerValues = rowMean(data.values);
      } else {
         this.centerValues = null;
      }

      // generate vector with std values for scaling (or null if no scaling is needed)
      if (this.param.autoscale == 2 || this.param.autoscale == 3) {
         this.scaleValues = rowSd(data.values);
      } else {
         this.scaleValues = null;
      }

      // define number of components and number of selected components
      if (ncomp > 0) {
         this.param.ncomp = Math.min(data.nObj - 1, data.nVar, 20, ncomp);
      }

      // autoscale the data values
      let values = autoscale(data.values, this.centerValues, this.scaleValues);

      // get the loadings
      let loadings = null;
      switch (this.param.method) {
         case 0:
            loadings = PCAModel.nipals(values, this.param.ncomp);
            break;
         case 1:
            loadings = PCAModel.ica(values, this.param.ncomp);
            break;
      }

      // convert loading values to Dataset object
      this.loadings = new Dataset(
         loadings,
         paste('Comp', seq(1, this.param.ncomp)),
         data.varNames,
         'Loadings',
         '',
         'Loadings',
         seq(1, this.ncomp),
         data.varAxisName,
         data.varAxisValues
      );

      // calculate PCA resilts for calibration set
      this.tnorm = null;
      this.calres = this.predict(data);
   }

   /**
    * Applies PCA model to a new dataset
    * @param {Dataset} newData A new set of values as Dataset object
    */
   predict (newData) {

      if (this.loadings == null) {
         return undefined;
      }

      // autoscale the new values using values calculated for calibration set
      let values = autoscale(newData.values, this.centerValues, this.scaleValues);

      // compute the scores and create a Dataset object
      let scores = numeric.dot(this.loadings.values, values);
      if (this.ncomp == 1) scores = [scores];

      scores = new Dataset(
         scores,
         this.loadings.varNames,
         newData.objNames,
         'Scores',
         '',
         'Components',
         seq(1, this.ncomp),
         newData.objAxisName,
         newData.objAxisValues
      );

      // compute vector with singular values for normalization of scores (for T2 residuals)
      // do it only once, when model is applied to calibration set
      if (this.tnorm == null) {
         this.tnorm = numeric.sqrt(numeric.div(rowSum(numeric.pow(scores.values, 2)), (scores.nObj - 1)));
      }

      // normalize the scores and prepare arrays for residual distances and cumulative explained variance
      var scoresn = autoscale(scores.values, false, this.tnorm);
      var T2 = Array(this.param.ncomp);
      var Q = Array(this.param.ncomp);
      var cumexpvar = Array(this.param.ncomp);
      var fullvar = numeric.sum(numeric.pow(values, 2));

      // calculate residual distanced and explained variance for each number of components
      for (var i = 1; i <= this.param.ncomp; i++) {
         var TPT = numeric.dot(numeric.transpose(this.loadings.values.slice(0, i)), scores.values.slice(0, i));
         var E = numeric.add(values, numeric.neg(TPT));
         Q[i - 1] = rowSum(numeric.transpose(numeric.pow(E, 2)));
         T2[i - 1] = rowSum(numeric.transpose(numeric.pow(scoresn.slice(0, i), 2)));
         cumexpvar[i - 1] = numeric.sum(numeric.pow(TPT, 2)) / fullvar * 100;
      }

      // compute explained variance for each component individually
      let expvar = numeric.add(cumexpvar, numeric.neg([0].concat(cumexpvar.slice(0, cumexpvar.length - 1))));
      cumexpvar = cumexpvar.map((x) => round(x * 100)/100);
      expvar = expvar.map((x) => round(x * 100)/100);

      // create PCAResults object and return
      return new PCARes(
         scores,
         new Dataset(
            T2,
            scores.varNames,
            scores.objNames,
            'Hotteling T2 residuals',
            '',
            scores.varAxisName,
            scores.varAxisValues,
            newData.objAxisName,
            newData.objAxisValues
         ),
         new Dataset(
            Q,
            scores.varNames,
            scores.objNames,
            'Squared orthogonal distance',
            '',
            scores.varAxisName,
            scores.varAxisValues,
            newData.objAxisName,
            newData.objAxisValues
         ),
         new Dataset(
            [expvar, cumexpvar],
            ['Individual', 'Cumulative'],
            scores.varNames,
            'Explained variance',
            '',
            null,
            null,
            'Components',
            seq(1, this.ncomp)
         ),
         'Calibration results'
      );
   }

   /**
    * Creates a plot for loadings using Plotly
    * @param {HTMLDomObject} id ID of DOM object (div) to show the plot in
    * @param {Numeric[]} comp Which components to make the plot for (one value or an array)
    * @param {Character} type Type of plot ('p', 'l', 'h')
    * @param {Object} param JSON object with plot parameters (see Dataset.plot() method for details)
    */
   plotLoadings (id, comp, param = {}) {
      if (!comp) {
         if (this.param.ncomp > 1) {
            comp = ['Comp 1', 'Comp 2'];
         } else {
            comp = ['Comp 1'];
         }
      }

      if (param.type == undefined) {
         if (comp.length > 1) {
            param.type = 'p';
         } else {
            param.type = 'h';
         }
      }

      // subset loadings for the given number of components
      let subset = this.loadings.subset(comp);

      // add percent of explained variance to the name for each component
      for (let i = 0; i < comp.length; i++) {
         subset.varNames[i] = subset.varNames[i] + ' (' + this.calres.variance.subset([0], comp[i]).values[0][0].toFixed(1) + '%)';
      }

      // show the plot
      let plot = subset.plot(id, modelPlotParam.calres(param));

      // for scatter plot adjust the axes limits
      /*
      if (param.type == 'p') {
         Plotly.relayout(plot, { "xaxis.range": [-1.2, 1.2], "yaxis.range": [-1.2, 1.2] });
      } else {
         Plotly.relayout(plot, { "yaxis.range": [-1.2, 1.2] });
      }
      */

      // for line plot add a siluette with preprocessed values
      if (param.type != 'p' && this.centerValues != null) {
         let prepValues = this.centerValues;
         if (this.scaleValues != null) {
            prepValues = numeric.div(prepValues, this.scaleValues);
         }
         const axsRange = plot.layout.yaxis.range;
         const axsDiff = axsRange[1] - axsRange[0];
         const valRange = [Math.min(...prepValues), Math.max(...prepValues)];
         const valDiff = valRange[1] - valRange[0];
         const newVal = numeric.add(numeric.dot(axsDiff/valDiff, numeric.add(prepValues, -valRange[0])), axsRange[0]);

         let meanTrace = {
            type: 'scatter',
            mode: 'lines',
            hoverinfo: 'none',
            x: this.loadings.objAxisValues,
            y: newVal,
            line: {
               color: "#e0e0e0",
               width: 2,
            }
         };

         if (param.type == 'h') {
            Plotly.addTraces(plot, [meanTrace]);
         } else {
            Plotly.addTraces(plot, [meanTrace], 0);
         }
      }
      return plot;
   }

   /**
    * Creates a plot for scores using Plotly
    * @param {HTMLDomObject} id ID of DOM object (div) to show the plot in
    * @param {Numeric[]} comp Which components to make the plot for (one value or an array)
    * @param {Character} type Type of plot ('p', 'l', 'h')
    * @param {Object} param JSON object with plot parameters (see Dataset.plot() method for details)
    */
   plotScores (id, comp, param = {}) {
      let plot = this.calres.plotScores(id, comp, modelPlotParam.calres(param));
      return plot;
   }

   /**
    * Creates a plot for scores using Plotly
    * @param {HTMLDomObject} id ID of DOM object (div) to show the plot in
    * @param {Numeric} ncomp Which component to make the plot for (one value)
    * @param {Object} param JSON object with plot parameters (see Dataset.plot() method for details)
    */
   plotDistance (id, ncomp = 1, param = {}) {

      let plot = this.calres.plotDistance(id, ncomp, modelPlotParam.calres(param));

      if (this.cvres != null) {
         Plotly.addTraces(plot, this.cvres.plotDistance(null, ncomp, modelPlotParam.cvres(param)));
         Plotly.relayout(plot, { showlegend: false });
      }

      Plotly.relayout(plot, { 'xaxis.range': [0, plot.layout.xaxis.range[1]], 'yaxis.range': [0, plot.layout.yaxis.range[1]]});
      return plot;
   }

   /**
    * Creates a plot for variance using Plotly
    * @param {HTMLDomObject} id ID of DOM object (div) to show the plot in
    * @param {Numeric} variance Which variance to make the plot for ('expvar' or 'cumexpvar')
    * @param {Object} param JSON object with plot parameters (see Dataset.plot() method for details)
    */
    plotVariance (id, variance = 'Expvar', param = {}) {
      let plot = this.calres.plotVariance(id, variance, modelPlotParam.calres(param));

      if (this.cvres != null) {
         Plotly.addTraces(plot, this.cvres.plotDistance(null, variance, modelPlotParam.cvres(param)));
         Plotly.relayout(plot, { showlegend: false });
      }

      return plot;
   }

   /**
    * Static methods for compiting PCA loadings using SVD
    * @param {Array} values Numeric 2D array with data after preprocessing
    */
   static svd (values) {
      let loadings = numeric.svd(numeric.transpose(values)).V;
      loadings = loadings.slice(0, this.param.ncomp);
      return loadings;
   }

   /**
    * Static method for computing PCA loadings using NIPALS
    * @param {Array} values Numeric 2D array with data after preprocessing
    */
   static nipals (values, ncomp, tolerance = 0.00001) {

      let loadings = Array(ncomp);
      let E = values;

      for (var i = 0; i < ncomp; i++) {
         var sd = rowSd(E);
         var ind = sd.indexOf(Math.max.apply(null, sd));
         var t = E[ind];
         var tau = 99999;
         var th = 9999;

         n = 1;
         var p = null;
         while (th > tolerance && n < 100 && th) {
            p = numeric.div(numeric.dot(E, t), numeric.dot(t, t));
            p = numeric.div(p, Math.sqrt(numeric.dot(p, p)));

            t = numeric.dot(p, E);
            t = numeric.div(t, numeric.dot(p, p));

            var tauNew = numeric.dot(t, t);
            th = Math.abs(tau - tauNew);
            tau = tauNew;
            n++;
         }
         E = numeric.add(E, numeric.neg(numeric.dot(numeric.transpose([p]), [t])));
         loadings[i] = p;
      }

      return loadings;
   }
}

/**
 * Interactive 3D application for PCA
 */
class PCA3DApp {
   constructor(data = people, varset = { X1: 'Height', X2: 'IQ', X3: 'Weight' }) {
      this.data = data;             // dataset
      this.varset = varset;         // selected variables (X1, X2, X3)
      this.model = new PCAModel();  // current PCA model
      this.ncomp = 2;               // number of componenta

      // index and values for selected data point (object)
      this.selection = {
         n: 0,
         X1: this.data.subset(varset.X1).values[0][0],
         X2: this.data.subset(varset.X2).values[0][0],
         X3: this.data.subset(varset.X3).values[0][0],
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
            .add(this, 'ncomp', [1, 2])
            .name('number of PCs')
            .onChange((value) => {
               this.updateAll();
            });
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
            .add(this.varset, 'X3', this.data.varNames)
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
            .add(this.selection, 'X3', mn[2] - df[2], mx[2] + df[2])
            .name(this.varset.X3)
            .listen()
            .onFinishChange(() => {
               this.updateAll('X3');
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
    * @param {Numeric} varNum which variable is changed (X1, X2 or X3)
    * @param {*} value new value for the variable
   */
   updateVarset(varNum, value) {
      if (varNum < 0 || varNum > 2) return undefined;

      // get name and values for the selected variable
      const varName = Object.keys(this.varset)[varNum];
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
         this.updateAll();
      }
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
         dataRaw.varNames = ['X1', 'X2', 'X3'];

         // dataset for scaled values
         let dataScaled = new Dataset(this.values, ["X1'", "X2'", "X3'"]);
         dataScaled = dataScaled.rbind(dataScaled.mean());

         // dataset for residual distances
         let dist = new Dataset(
            [
               this.model.calres.T2.subset(this.ncomp - 1).values[0],
               this.model.calres.Q.subset(this.ncomp - 1).values[0],
            ],
            ["T2", "Q"]
         );
         dist = dist.rbind(dist.mean());

         // dataset for projections
         let proj = new Dataset(
            this.projections,
            ['X1', 'X2', 'X3']
         );
         proj = proj.rbind(proj.mean());

         // dataset for redisuals
         let res = new Dataset(
            numeric.add(this.values, numeric.neg(this.projections)),
            ['X1', 'X2', 'X3']
         );
         res = res.rbind(res.mean());

         // dataset for scores
         let scores = this.model.calres.scores.rbind(this.model.calres.scores.mean());

         obj.innerHTML = '' +
            '<div><h2>X, raw</h2>' + dataRaw.asTable({ showObjNames: true, current: n }) + '</div>' +
            '<div><h2>X, autoscaled</h2>' + dataScaled.asTable({ showObjNames: false, dec: 1, current: n }) + '</div>' +
            "<div><h2>TP'</h2>" + proj.asTable({ showObjNames: false, dec: 1, current: n }) + '</div>' +
            '<div><h2>E</h2>' + res.asTable({ showObjNames: false, dec: 2, current: n }) + '</div>' +
            '<div><h2>Scores</h2>' + scores.asTable({ showObjNames: false, dec: 1, current: n }) + '</div>' +
            '<div><h2>Distances</h2>' + dist.asTable({ showObjNames: false, current: n }) + '</div>';
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
         this.model.loadings.asTable({showObjNames: true, dec: 3}) +
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
         x: [
            this.values[0],
            this.projections[0],
            this.plane[0],
            [this.plane[0][1], this.plane[0][7]],
            [this.plane[0][3], this.plane[0][5]]
         ],
         y: [
            this.values[1],
            this.projections[1],
            this.plane[1],
            [this.plane[1][1], this.plane[1][7]],
            [this.plane[1][3], this.plane[1][5]]
         ],
         z: [
            this.values[2],
            this.projections[2],
            this.plane[2],
            [this.plane[2][1], this.plane[2][7]],
            [this.plane[2][3], this.plane[2][5]]
         ],
      };

      // update names for axes
      var updateLayout = {
         scene: {
            xaxis: { title: this.varset.X1 },
            yaxis: { title: this.varset.X2 },
            zaxis: { title: this.varset.X3 },
         }
      };

      // show the updated plots (both for 3D and model)
      if (this.gui.dom.plotPane != null) {
         Plotly.restyle(this.gui.dom.plotPane, updatePlots, [0, 1, 2, 3, 4]);
         Plotly.relayout(this.gui.dom.plotPane, updateLayout);

         this.updateInfo();
         this.select(nObj);
      }
   }

   /**
    * Computes model and data for 3D plot
    */
   computePlotData() {
      // calibrate PCA model and compute coordinates of projected points
      let data =  this.data.subset(Object.values(this.varset));
      this.model.calibrate(data, this.ncomp);
      this.values = autoscale(data.values, this.model.centerValues, this.model.scaleValues);
      this.projections = numeric.dot(numeric.transpose(this.model.loadings.values), this.model.calres.scores.values);

      // compute evenly spread coordinates to show PC space as a plane
      const n = 10;
      const maxScores = rowMax(numeric.abs(this.model.calres.scores.values));
      const pc1Scores = [-maxScores[0], 0, maxScores[0], -maxScores[0], 0, maxScores[0], -maxScores[0], 0, maxScores[0]];
      const pc2Scores = [-maxScores[1], -maxScores[1], -maxScores[1], 0, 0, 0, maxScores[1], maxScores[1], maxScores[1]];
      this.plane = numeric.transpose(numeric.dot(numeric.transpose([pc1Scores, pc2Scores]), this.model.loadings.values));
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
      this.selection.X3 = subset.values[2][n];

      var update = {
         x: [[this.values[0][n]], [this.projections[0][n]], [this.values[0][n], this.projections[0][n]]],
         y: [[this.values[1][n]], [this.projections[1][n]], [this.values[1][n], this.projections[1][n]]],
         z: [[this.values[2][n]], [this.projections[2][n]], [this.values[2][n], this.projections[2][n]]],
      };

      Plotly.restyle(this.gui.dom.plotPane, update, null, [5, 6, 7]);
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
            zaxis: { title: this.varset.X3 },
         }
      };

      const dataTrace = {
         opacity: 0.75,
         size: 0.5,
         hoverinfo: 'text',
         text: this.data.objNames,
         type: 'scatter3d',
         x: this.values[0],
         y: this.values[1],
         z: this.values[2],
         mode: 'markers',
         marker: {
            size: 6,
            color: 'dodgerblue'
         }
      };

      const projectionsTrace = {
         opacity: 1,
         size: 0.5,
         type: 'scatter3d',
         hoverinfo: 'text',
         text: this.data.objNames,
         x: this.projections[0],
         y: this.projections[1],
         z: this.projections[2],
         mode: 'markers',
         marker: {
            size: 4,
            color: 'dodgerblue'
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

      var modelPC1Trace = {
         x: [this.plane[0][1], this.plane[0][7]],
         y: [this.plane[1][1], this.plane[1][7]],
         z: [this.plane[2][1], this.plane[2][7]],
         hoverinfo: 'none',
         type: 'scatter3d',
         mode: 'lines',
         marker: {
            color: 'orange',
         }
      };

      var modelPC2Trace = {
         x: [this.plane[0][3], this.plane[0][5]],
         y: [this.plane[1][3], this.plane[1][5]],
         z: [this.plane[2][3], this.plane[2][5]],
         hoverinfo: 'none',
         type: 'scatter3d',
         mode: 'lines',
         marker: {
            color: 'orange',
         }
      };

      const selDataTrace = {
         opacity: 1,
         size: 0.5,
         type: 'scatter3d',
         hoverinfo: 'text',
         text: this.data.objNames,
         x: this.values[0][0],
         y: this.values[1][0],
         z: this.values[2][0],
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
         x: this.projections[0][0],
         y: this.projections[1][0],
         z: this.projections[2][0],
         mode: 'markers',
         marker: {
            size: 6,
            color: '#1564b2'
         }
      };

      const selDistanceTrace = {
         x: [this.values[0][0], this.projections[0][0]],
         y: [this.values[1][0], this.projections[1][0]],
         z: [this.values[2][0], this.projections[2][0]],
         hoverinfo: 'text',
         text: ['orthogonal residual distance'],
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
            dataTrace, projectionsTrace,
            modelPlaneTrace, modelPC1Trace, modelPC2Trace,
            selDataTrace, selProjectionsTrace, selDistanceTrace,
         ],
         layout,
         { displayModeBar: false }
      );

      // this option is off as it makes rotation of 3D plot more tricky
      // the use of setTimeout is a workaround for an plotly issue reported in
      // https://github.com/plotly/plotly.js/issues/1025
/*
      this.gui.dom.plotPane.on('plotly_click', (data) => {
         setTimeout(function(obj, n) { obj.select(n); }, 100, this, data.points[0].pointNumber);
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
      let p1 = this.model.plotScores(
         document.getElementById('scoresPlot'), null,
         { showLabels: true, markerSize: 6, current: nObj }
      );
      p1.on('plotly_click', (data) => {
         this.select(data.points[0].pointNumber);
      });

      let p2 = this.model.plotDistance(
         document.getElementById('residualsPlot'), this.model.param.ncomp,
         { showLabels: true, markerSize: 6, current: nObj }
      );
      p2.on('plotly_click', (data) => {
         this.select(data.points[0].pointNumber);
      });

      this.model.plotLoadings(
         document.getElementById('loadingsPlot'), null,
         { showLabels: true, markerSize: 6 }
      );
   }
}

/** Class for PCA app */
class PCAAppPlot extends MDAAppPlot {
   constructor (parent, plotPane, settingsPane, data = 'scores') {
      super(parent, plotPane, settingsPane, ['scores', 'loadings', 'residuals', 'variance']);
      this.parent = parent;
      this.param.data = data;
      this.param.resncomp = 1;
      this.setDefaultSettings();
      this.update();
   }

   setDefaultSettings() {
      switch (this.param.data) {
         case 'scores':
            this.param.type = 'p';
            break;
         case 'loadings':
            this.param.type = 'p';
            this.param.colorby = 'none';
            break;
         case 'residuals':
           this.param.type = 'p';
           this.param.colorby = 'none';
           break;
         case 'variance':
            this.param.type = 'h';
            break;
      }
   }

   updateSettings() {
      super.updateSettings();
      switch (this.param.data) {
         case 'scores':
            this.setScoresPlotSettings();
            break;
         case 'loadings':
            this.setLoadingsPlotSettings();
            break;
         case 'residuals':
            this.setResidualsPlotSettings();
            break;
         case 'variance':
            this.setVariancePlotSettings();
            break;
      }
   }

   plot() {
      // get values for color by option
      let param = Object.assign({}, this.param, {});
      param.colorby = 'none';
      if (this.param.colorby != 'none') {
         if (this.param.colorby == this.parent.dataset().objAxisName) {
            param.colorby = this.parent.dataset().objAxisValues;
         } else {
            param.colorby = this.parent.dataset().subset(this.param.colorby).values[0];
         }
      }

      // create plot
      let comp = [param.xaxis, param.yaxis];
      switch (this.param.data) {
         case 'scores':
            if (param.xaxis == 'Objects') {
               comp = [param.yaxis];
            }
            this.parent.model.plotScores(this.plotPane, comp, param);
            super.plot();
            break;
         case 'loadings':
            if (param.xaxis == 'Variables') {
               comp = [param.yaxis];
            }
            this.parent.model.plotLoadings(this.plotPane, comp, param);
            super.plot();
            break;
         case 'residuals':
            this.parent.model.plotDistance(this.plotPane, param.ncomp, param);
            super.plot();
            break;
         case 'variance':
            this.parent.model.plotVariance(this.plotPane, param.variance, param);
            super.plot();
            break;
      }
   }
}

class PCAApp extends MDAApp {
   constructor(datasets, parent = null) {
      super(datasets, parent);
      this.nCompMax = 2;
      this.model = new PCAModel();
      this.model.param.ncomp = 2;

      let el2 = this.gui.modelSettingsPane;
      if (el2) {
         this.settings.model = new dat.GUI({ autoplace: false, width: '100%' });
         this.settings.model
            .add(this.model.param, 'ncomp').min(1).max(this.nCompMax).step(1)
            .name('number of PCs')
            .listen()
            .onFinishChange(() => {
               this.updateAll();
            });
         this.settings.model
            .add(this.model.param, 'autoscale', this.model.options.autoscale)
            .listen()
            .onFinishChange(() => {
               this.updateAll();
            });
         el2.appendChild(this.settings.model.domElement);
      }

      this.selectDataset();
   }

   selectDataset() {
      // set maximum number of components
      this.nCompMax = Math.min(this.dataset().nObj - 1, this.dataset().nVar, 10);

      // change limits for the number of components settings element
      if (this.settings.model.__controllers[0]) {
         this.settings.model.__controllers[0].__min = 1;
         this.settings.model.__controllers[0].__max = this.nCompMax;
         this.settings.model.__controllers[0].updateDisplay();
      }

      super.selectDataset();
   }

   createPlots() {
      this.plots[0] = new PCAAppPlot(this, this.gui.plot1Pane, this.gui.plot1SettingsPane, 'scores');
      this.plots[1] = new PCAAppPlot(this, this.gui.plot2Pane, this.gui.plot2SettingsPane, 'residuals');
      this.plots[2] = new PCAAppPlot(this, this.gui.plot3Pane, this.gui.plot3SettingsPane, 'loadings');
      this.plots[3] = new PCAAppPlot(this, this.gui.plot4Pane, this.gui.plot4SettingsPane, 'variance');
   }
}