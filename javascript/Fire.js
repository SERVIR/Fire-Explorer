var map;
var loading;
var wkid = 102100;
var graphicsLayer;
var bucketItemDelimiter = " - ";
var bucketMapForAttribute = {
		
	"CONFIDENCE":10,
	"FRP":20,
	"BRIGHTT31":20,
	"BRIGHTNESS":20
};

var attrDescriptions = {
		
	"CONFIDENCE":"The detection confidence is a quality flag of the individual hotspot/active fire pixel.",
	"FRP":" Fire Radiative Power. Depicts the pixel-integrated fire radiative power in MW (MegaWatts). FRP provides information on the measured radiant heat output of detected fires. The amount of radiant heat energy liberated per unit time (the Fire Radiative Power) is thought to be related to the rate at which fuel is being consumed)",
	"BRIGHTT31":"Channel 31 brightness temperature (in Kelvins) of the hotspot/active fire pixel.",
	"BRIGHTNESS":"The brightness temperature, measured (in Kelvin) using the MODIS channels 21/22 and channel 31."
};
var attrPlainEnglishNameMap = {
		
	"Confidence":"CONFIDENCE",
	"Fire Radiative Power":"FRP",
	"Channel 31 Brightness":"BRIGHTT31",
	"Brightness":"BRIGHTNESS"
};
var fireAttrsForDropDown = ['Confidence', 'Fire Radiative Power', 'Channel 31 Brightness', 'Brightness'];


dojo.addOnLoad(init);

function init() {
	
	dojo.parser.parse();
	
	dojo.byId("headerTitle").innerHTML = "MODIS 24-Hour Fire";
	
    esriConfig.defaults.map.slider = { left: "30px", top: "60px", width: null, height: "200px" };
    var initialExtent = new esri.geometry.Extent({"xmin":-13215580.33,"ymin":-1451997.95,"xmax":4395510.99,"ymax":10288729.59,"spatialReference":{"wkid":102100}});
	map = new esri.Map("map", { extent: initialExtent });
    
	resizer = new base_classes.scripts.MapResizer(map, 800);
	dojo.connect(dojo.query("body")[0],"onresize",function() {
		resizer.resizeTimer();
	});
	
	// connect layer list tool
	dojo.connect(dojo.byId("mapLayers"), "onclick", function() {
		LayerListTool.initLayerListTool();
	});
			
    // retrieve map layers
	var basemapLayers = getBasemapLayers();
	
	// load the map layers
	var mapServiceLoader = new base_classes.scripts.MapServiceLoader(map);
	mapServiceLoader.loadLayers(basemapLayers);
	
	graphicsLayer = new esri.layers.GraphicsLayer();
	map.addLayer(graphicsLayer);
		
	// init base map controller
	var basemapPanelDivID = "baseMapToolPanel";
	var mapServiceList = getListFromKey(basemapLayers, "mapServiceId");
	basemapController = new base_classes.scripts.BasemapLayerController(map, mapServiceList, basemapPanelDivID);
	
	var baseMapToolButton = dojo.byId("baseMapToolButton");
	var baseMapToolButtonImage = dojo.byId("baseLayers");
	dojo.connect(baseMapToolButton, 'onclick', function() {basemapController.wipeInBaseMapPanel();});
	dojo.connect(baseMapToolButton, "onmouseover", function(){baseMapToolButtonImage.src = '../base_classes/images/baseMapTool_Blue_Hover.png';});
	dojo.connect(baseMapToolButton, "onmouseout", function(){baseMapToolButtonImage.src = '../base_classes/images/baseMapTool_Blue_Default.png';});
	dojo.connect(baseMapToolButton, "onmousedown", function(){baseMapToolButtonImage.src = '../base_classes/images/baseMapTool_Blue_MouseDown.png';});
	
	dojo.forEach(basemapLayers, function(layer) {
		
		var layerName = layer.mapServiceId;
		var layerButton = dojo.byId(layerName);
		dojo.connect(layerButton, "onmouseout", function(){layerButton.src = layer.mouseOutImage;});
		dojo.connect(layerButton, "onmouseover", function(){layerButton.src = layer.mouseOverImage;});
		dojo.connect(layerButton, 'onclick', function() {basemapController.toggleBaseMapService(layerName);});		
	});
	
	createToolTipDialog("valueInfo", "All values contained in the drop down are for the given 24-hour period.");
	createToolTipDialog("dateInfo", "The start date begins the 24-hour period.");

	showLoading("retrieving time extent", "mapContainer");
	
	getMapServiceTimeExtent();
}

function getMapServiceTimeExtent() {
		
	dojo.xhrPost({
		
		url: "http://SERVER IP/arcgis/rest/services/ReferenceNode/MODIS_Fire/MapServer?f=json",
		contentType: "text/plain;charset=utf-8",
		handleAs: "json",
		load: onGetTimeExtentResult,
		error: function(err) {
			console.log("error", err);
		}
	});
}

function onGetTimeExtentResult(items) {
	
	var min_date = convertEpochToDateString(items.timeInfo.timeExtent[0]);
	console.log("min_date",min_date);
	
	var max_date = convertEpochToDateString(items.timeInfo.timeExtent[1]);
	console.log("max_date",max_date);

	LayerListTool.initLayerListTool();
	
	addDatePickerWithRange("startDateDropDownBox", "startDateDropDownDP", min_date, max_date, getAttributeExtrema);
	addDropDownList("fireAttributeDropDownBox", "fireAttributeDropDown", fireAttrsForDropDown, getAttributeExtrema);
	
	hideLoading();

	getAttributeExtrema();
}

function getAttributeExtrema() {
	
	showLoading("loading values", "layerListDialog");
	
	var attr = getFireAttributeSelected();	
	console.log("attr", attr);

	var attrDesc = attrDescriptions[attr];
	createToolTipDialog("attributeInfo", attrDesc);
	
	var fireMapServerURL = "http://SERVIR IP/arcgis/rest/services/ReferenceNode/MODIS_Fire/MapServer/0";
	
	var startDate = convertDojoPickerDateFormatForESRIQuery(getStartDateSelected());
	var endDate = addDaysToDate(getStartDateSelected(), 1);
	endDate = getStringFromDate(endDate);
	var whereClause =  "DATE  >= date '" + startDate + "' AND DATE <= date '" + endDate + "'";
	var outFields = [attr];
	
	function onAttributeExtremaResult(resultSet) {
		
		hideLoading();
		
		var	confidenceValues = [];

		var listOfDicts = resultSet.features;
		dojo.forEach(listOfDicts, function(x) {
			confidenceValues.push(x.attributes[attr]);
		});
		
		confidenceValues = eliminateDuplicates(confidenceValues);
		confidenceValues.sort(function(a, b) {
			return a-b;
		});
		
		numberOfBuckets = bucketMapForAttribute[attr];
		confidenceValues = getListOfStringExtremaFromListOfValues(confidenceValues, numberOfBuckets, bucketItemDelimiter);
		
		addDropDownList("fireAttributeValueDropDownBox", "fireAttributeValueDropDown", confidenceValues, queryFeaturesForDateTime);
		queryFeaturesForDateTime();
	}
	
	queryMapServer(fireMapServerURL, whereClause, outFields, onAttributeExtremaResult, /*returnGeometry =*/false);
}

function queryFeaturesForDateTime() {
	
	var fireMapServerURL = "http://SERVIR IP/arcgis/rest/services/ReferenceNode/MODIS_Fire/MapServer/0";
	var whereClause = getWhereClauseForQuery();
	console.log("whereClause",whereClause);
	var outFields = [];
	
	showLoading("executing spatial query", "mapContainer");
	queryMapServer(fireMapServerURL, whereClause, outFields, onMapQueryResult, /*returnGeometry =*/true);
}

function getWhereClauseForQuery() {
	
	var startDate = convertDojoPickerDateFormatForESRIQuery(getStartDateSelected());
	var endDate = addDaysToDate(getStartDateSelected(), 1);
	endDate = getStringFromDate(endDate);
	
	var valueString = getFireAttributeValueSelected();
	valueString = valueString.split(bucketItemDelimiter);
	var maxValue = parseInt(valueString[1]);
	var minValue = parseInt(valueString[0]);
	var attr = getFireAttributeSelected();
	var whereValueEquals = attr + " >= " + minValue + " AND " + attr + " <= " + maxValue;
	var whereDateEquals = "DATE  >= date '" + startDate + "' AND DATE <= date '" + endDate + "'";
	
	return  whereDateEquals + " AND " + whereValueEquals;
}

function addDaysToDate(d, numberOfDays) {
	
	return d.setDate(d.getDate() + numberOfDays);
}

function getStringFromDate(d) {
	
	d = new Date(d);
	var month = d.getUTCMonth() + 1;
	var d1 = [d.getUTCFullYear(), month, d.getUTCDate()].join("-"); /* YYYY-MM-dd*/
	
	return d1;	
}

function onMapQueryResult(featureSet) {
	
	if(featureSet.features.length == 0) {
		
		hideLoading();
		console.log("No features returned");
		graphicsLayer.clear();
		return;
	}

	var extent = esri.graphicsExtent(featureSet.features);
	map.setExtent(extent.expand(1.5));
	map.resize();
	map.reposition();
	
	var result_features = featureSet.features;
	var result_features_length = result_features.length;
	graphicsLayer.clear();
	
	for (var i=0; i < result_features_length; i++) {
		
		console.log("adding point...");

		var graphic = result_features[i];
		
		var symbol = new esri.symbol.SimpleMarkerSymbol(esri.symbol.SimpleMarkerSymbol.STYLE_CIRCLE, 3,
				   	 new esri.symbol.SimpleLineSymbol(esri.symbol.SimpleLineSymbol.STYLE_SOLID, 
						   new dojo.Color([255,0,0,1])),
						   new dojo.Color([255,0,0,1]));
		
	    graphic.setSymbol(symbol);
	    graphicsLayer.add(graphic);		
	}
	
	hideLoading();
}

function getStartDateSelected(){return dijit.byId("startDateDropDownDP").get('value');}
function getEndDateSelected(){return dijit.byId("endDateDropDownDP").get('value');}
function getTimeSelected(){return dijit.byId("timesDropDown").get('value');}
function getFireAttributeSelected(){return attrPlainEnglishNameMap[dijit.byId("fireAttributeDropDown").get('value')];}
function getFireAttributeValueSelected(){return dijit.byId("fireAttributeValueDropDown").get('value');}

function convertEpochToDateString(epochSeconds) {

	var d = new Date(epochSeconds);	
	var month = d.getUTCMonth() + 1;
	if(month < 10) {
		month = "0" + month;
	}
	var d1 = [d.getUTCFullYear(), month, d.getUTCDate()].join("-"); /* YYYY-MM-dd*/
	
	return d1;
}

function convertDojoPickerDateFormatForESRIQuery(d) {
	
	var month = d.getUTCMonth() + 1;
	var d1 = [d.getUTCFullYear(), month, d.getUTCDate()].join("-"); /* YYYY-MM-dd*/
	
	return d1;
}

function queryMapServer(mapServerURL, whereClause, outFields, callbackFunc, returnGeometry) {
	
	try {
		
	   	var query = new esri.tasks.Query();
	   	query.returnGeometry = returnGeometry;
	   	query.outSpatialReference = {'wkid':wkid};
	    query.outFields = outFields;
		query.where = whereClause;
	   	new esri.tasks.QueryTask(mapServerURL).execute(query, callbackFunc);
	}
	catch(exception) {
		console.log("exception",exception);
	}
}

function onSliderChange() {
	
	var fireMapServerURL = "http://SERVIR IP/arcgis/rest/services/ReferenceNode/MODIS_Fire/MapServer/0";
	var whereClause = getWhereClauseForQuery();
	console.log("whereClause",whereClause);
	var outFields = [];
	
	queryMapServer(fireMapServerURL, whereClause, outFields, onMapQueryResult, /*returnGeometry =*/true);	
}

function getMaxValue(listOfValues) {
	return Math.max.apply(null, listOfValues);
}

function getMinValue(listOfValues) {
	return Math.min.apply(null, listOfValues);
}

function showLoading(message, div_id) {
	
	if(!loading) {
		
		loading = new CustomComponents.Classes.loading(div_id, message);
		loading.show();
	}
};

function hideLoading() {
	
	if(loading) {
		
		loading.hide();
		loading.kill();
		loading = null;
	}
};