class MDAAppPlot {
   constructor(parent, plotPane, settingsPane, plotDataOptions) {
      this.parent = parent;
      this.plotPane = plotPane;
      this.settingsPane = settingsPane;
      this.plotDataOptions = plotDataOptions;

      this.param = {
         data: plotDataOptions[0],
         type: 'p',
         ncomp: 1,
         xaxis: null,
         yaxis: null,
         colorby: 'none',
         groupby: 'none',
         variance: 'Individual',
         showLabels: false
      };

      // create settings general for all types of plots
      this.settings = new dat.GUI({ autoplace: false, width: '100%' });
      this.settings
         .add(this.param, 'data', plotDataOptions)
         .name('plot for ')
         .listen()
         .onFinishChange(() => { this.setDefaultSettings(); this.update(); });

      if (this.settingsPane.childNodes.length > 0) {
         this.settingsPane.removeChild(this.settingsPane.childNodes[0]);
      }

      this.settingsPane.appendChild(this.settings.domElement);
      this.settingsPane.style.display = 'none';
   }

   update() {
      this.updateSettings();
      this.plot();
   }

   /**
    * Creates settings elelents common for scores and loadings
    */
    setCommomPlotSettings(xaxisInitialValue) {

      // settings for plot data
      this.settings
         .add(this.param, 'type', {'scatter': 'p', 'line': 'l', 'linescatter': 'b', 'bar': 'h'})
         .name('type ')
         .listen()
         .onFinishChange(() => { this.update(); });

      // settings for x-axis and y-axis
      if (this.param.type == 'p') {
         this.param.xaxis =  'Comp 1';
         this.param.yaxis =  'Comp 2';
         if (this.parent.model.param.ncomp > 2) {
            this.settings
               .add(this.param, 'xaxis', [xaxisInitialValue].concat(paste('Comp', seq(1, this.parent.model.param.ncomp))))
               .name('x-axis')
               .listen()
               .onFinishChange(() => { this.plot(); });
            this.settings
            .add(this.param, 'yaxis', [xaxisInitialValue].concat(paste('Comp', seq(1, this.parent.model.param.ncomp))))
            .name('y-axis')
               .listen()
               .onFinishChange(() => { this.plot(); });
         } else if (this.parent.model.param.ncomp == 1){
            this.param.xaxis =  xaxisInitialValue;
            this.param.yaxis =  'Comp 1';
         }
      } else {
         this.settings
            .add(this.param, 'yaxis', paste('Comp', seq(1, this.parent.model.param.ncomp)))
            .name('y-axis')
            .listen()
            .onFinishChange(() => { this.plot(); });
         this.param.xaxis =  xaxisInitialValue;
         this.param.yaxis =  'Comp 1';
      }

      // settings for showing labels
      this.settings
         .add(this.param, 'showLabels', false)
         .name('show labels ')
         .listen()
         .onFinishChange(() => { this.plot(); });
   }

   /**
    * Creates settings elelents common for plots with objects (scores, residuals, predictions, etc)
    */
   setObjectPlotSettings() {
      if (this.param.type == 'p') {
         this.settings
            .add(this.param, 'colorby', ['none'].concat(this.parent.dataset().objAxisName).concat(this.parent.dataset().varNames))
            .name('color by')
            .listen()
            .onFinishChange(() => { this.plot(); });
         this.param.colorby = 'none';
      }
   }

   /**
    * Creates settings elements for scors plots
    */
   setScoresPlotSettings() {
      this.setCommomPlotSettings('Objects');
      this.setObjectPlotSettings();
   }

   /**
    * Creates settings elements for loadings plots
    */
   setLoadingsPlotSettings() {
      this.setCommomPlotSettings('Variables');
   }

   /**
    * Creates settings elements for residuals plots
    */
    setResidualsPlotSettings() {
      this.setObjectPlotSettings();
      this.settings
         .add(this.param, 'showLabels', false)
         .name('show labels ')
         .listen()
         .onFinishChange(() => { this.plot(); });
      this.settings
         .add(this.param, 'ncomp').min(1).max(this.parent.model.param.ncomp).step(1)
         .name('ncomp ')
         .listen()
         .onFinishChange(() => { this.plot(); });
   }

   /**
    * Creates settings elements for variance plots
    */
   setVariancePlotSettings() {
      // settings for type of variance
      this.settings
         .add(this.param, 'variance', ['Individual', 'Cumulative'])
         .name('variance ')
         .listen()
         .onFinishChange(() => { this.plot(); });
      // settings for plot data
      this.settings
         .add(this.param, 'type', {'line': 'l', 'linescatter': 'b', 'bar': 'h'})
         .name('type ')
         .listen()
         .onFinishChange(() => { this.update(); });
   }

   updateSettings() {
      // remove old controllers
      const nSettings = this.settings.__controllers.length;
      for (let i = 1; i < nSettings; i++) {
         if (this.settings.__controllers[1]) {
            this.settings.remove(this.settings.__controllers[1]);
         }
      }
   }

   plot() {
      resizePlot(this.plotPane);
   }
}

class MDAApp {
   constructor(datasets, parent = null) {
      this.model = null;
      this.datasets = datasets;
      this.datasetName = Object.keys(datasets)[0];
      this.dataset = function() { return this.datasets[this.datasetName]; };
      this.settings = {};
      this.plots = Array(4);
      this.currentPlot = 0;

      if (parent == null) {
         parent = document.body;
      }

      this.gui = {};
      this.gui.appPane = document.createElement('div');
      this.gui.appPane.setAttribute('id', 'appPane') ;

      // create second level elements (left and right panes)
      this.gui.settingsPane = document.createElement('div');
      this.gui.settingsPane.setAttribute('id', 'settingsPane') ;
      this.gui.plotsPane = document.createElement('div');
      this.gui.plotsPane.setAttribute('id', 'plotsPane') ;
      this.gui.appPane.appendChild(this.gui.settingsPane);
      this.gui.appPane.appendChild(this.gui.plotsPane);

      // create elements for settings
      this.gui.appSettingsPane = document.createElement('div');
      this.gui.appSettingsPane.setAttribute('id', 'appSettingsPane') ;
      this.gui.appSettingsPane.setAttribute('class', 'settings');
      this.gui.settingsPane.appendChild(this.gui.appSettingsPane);

      this.gui.modelSettingsPane = document.createElement('div');
      this.gui.modelSettingsPane.setAttribute('id', 'modelSettingsPane') ;
      this.gui.modelSettingsPane.setAttribute('class', 'settings');
      this.gui.settingsPane.appendChild(this.gui.modelSettingsPane);

      // create panes for plot settings
      this.gui.plot1SettingsPane = document.createElement('div');
      this.gui.plot1SettingsPane.setAttribute('id', 'plot1SettingsPane');
      this.gui.plot1SettingsPane.setAttribute('class', 'plotSettingsPane');
      this.gui.settingsPane.appendChild(this.gui.plot1SettingsPane);

      this.gui.plot2SettingsPane = document.createElement('div');
      this.gui.plot2SettingsPane.setAttribute('id', 'plot2SettingsPane');
      this.gui.plot2SettingsPane.setAttribute('class', 'plotSettingsPane');
      this.gui.settingsPane.appendChild(this.gui.plot2SettingsPane);

      this.gui.plot3SettingsPane = document.createElement('div');
      this.gui.plot3SettingsPane.setAttribute('id', 'plot3SettingsPane');
      this.gui.plot3SettingsPane.setAttribute('class', 'plotSettingsPane');
      this.gui.settingsPane.appendChild(this.gui.plot3SettingsPane);

      this.gui.plot4SettingsPane = document.createElement('div');
      this.gui.plot4SettingsPane.setAttribute('id', 'plot4SettingsPane');
      this.gui.plot4SettingsPane.setAttribute('class', 'plotSettingsPane');
      this.gui.settingsPane.appendChild(this.gui.plot4SettingsPane);

      // create elements for left plots
      let leftPlotPane = document.createElement('div');
      leftPlotPane.setAttribute('id', 'leftPlots');
      leftPlotPane.setAttribute('class', 'split split-horizontal');

      this.gui.plot1Pane = document.createElement('div');
      this.gui.plot1Pane.setAttribute('id', 'plot1Pane') ;
      this.gui.plot1Pane.setAttribute('class', 'split content plot-pane') ;
      this.gui.plot1Pane.setAttribute('onclick', 'app.selectPlot(0)') ;

      this.gui.plot2Pane = document.createElement('div');
      this.gui.plot2Pane.setAttribute('id', 'plot2Pane') ;
      this.gui.plot2Pane.setAttribute('class', 'split content plot-pane') ;
      this.gui.plot2Pane.setAttribute('onclick', 'app.selectPlot(1)') ;

      leftPlotPane.appendChild(this.gui.plot1Pane);
      leftPlotPane.appendChild(this.gui.plot2Pane);
      this.gui.plotsPane.appendChild(leftPlotPane);

      // create elements for right plots
      let rightPlotPane = document.createElement('div');
      rightPlotPane.setAttribute('id', 'rightPlots');
      rightPlotPane.setAttribute('class', 'split split-horizontal');

      this.gui.plot3Pane = document.createElement('div');
      this.gui.plot3Pane.setAttribute('id', 'plot3Pane') ;
      this.gui.plot3Pane.setAttribute('class', 'split content plot-pane') ;
      this.gui.plot3Pane.setAttribute('onclick', 'app.selectPlot(2)') ;

      this.gui.plot4Pane = document.createElement('div');
      this.gui.plot4Pane.setAttribute('id', 'plot4Pane') ;
      this.gui.plot4Pane.setAttribute('class', 'split content plot-pane') ;
      this.gui.plot4Pane.setAttribute('onclick', 'app.selectPlot(3)') ;

      rightPlotPane.appendChild(this.gui.plot3Pane);
      rightPlotPane.appendChild(this.gui.plot4Pane);
      this.gui.plotsPane.appendChild(rightPlotPane);

      // attach everything to body
      parent.appendChild(this.gui.appPane);

      // prepare the layout (split, etc)
      Split(['#leftPlots', '#rightPlots'], {
         sizes: [50, 50],
         minSize: [400, 400],
         direction: 'horizontal',
         gutterSize: 3,
         cursor: 'col-resize',
         onDragEnd:  () => { this.resizePlots(); return; }
      });

      Split(['#plot1Pane', '#plot2Pane'], {
         sizes: [50, 50],
         minSize: [300, 300],
         direction: 'vertical',
         gutterSize: 3,
         cursor: 'row-resize',
         onDragEnd:  () => { this.resizePlots(); return; }
      });

      Split(['#plot3Pane', '#plot4Pane'], {
         sizes: [50, 50],
         minSize: [300, 300],
         direction: 'vertical',
         gutterSize: 3,
         cursor: 'row-resize',
         onDragEnd:  () => { this.resizePlots(); return; }
      });

      // process keypress events for showing help and table
      window.addEventListener("keydown", (e) => {
         const elHelp = document.getElementById("helpDialog");
         switch (e.key) {
            case 'h':
               // show/hide window with help text
               elHelp.style.display = (elHelp.style.display == 'none' || !elHelp.style.display) ? 'block' : 'none';
               break;
         }
      });

      // settings for app (dataset list)
      let el1 = this.gui.appSettingsPane;
      if (el1) {
         this.settings.app = new dat.GUI({ autoplace: false, width: '100%' });
         this.settings.app
            .add(this, 'datasetName', Object.keys(datasets))
            .name('dataset')
            .onChange(() => {
               this.selectDataset();
            });
         el1.appendChild(this.settings.app.domElement);
      }
   }

   resizePlots() {
      window.dispatchEvent(new Event('resize'));
   }

   selectPlot(n) {
      // unselect current plot
      this.plots[this.currentPlot].settingsPane.style.display = 'none';
      if (this.plots[this.currentPlot].plotPane.classList.contains('selected')) {
         this.plots[this.currentPlot].plotPane.classList.remove('selected');
      }

      // select the new one
      if (this.plots[n]) {
         this.plots[n].settingsPane.style.display = 'block';
         this.plots[n].plotPane.classList.add('selected');
         this.currentPlot = n;
      }
   }

   selectDataset() {
      // update model and plots
      this.updateAll();
   }

   updateModel() {
      this.model.calibrate(this.dataset());
   }

   updatePlots() {
      for (let i = 0; i < this.plots.length; i++) {
         this.plots[i].plot();
      }
   }

   updateAll() {
      this.updateModel();
      this.createPlots();
      this.selectPlot(0);
   }
}