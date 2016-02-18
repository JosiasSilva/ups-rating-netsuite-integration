/**
 * Script: Suitelet UPS Rating
 * Relative URL: /app/site/hosting/scriptlet.nl?script=59&deploy=1
 */

function onStart(request, response){  
	var shipToCountry = request.getParameter('shiptocountry');
	var shipToState = request.getParameter('shiptostate');
	var shipToCity = request.getParameter('shiptocity');
	var shipToZip = request.getParameter('shiptozip');
	var shipToResidentialIndicator = request.getParameter('shiptoresidentialindicator');
	var shipMethod = request.getParameter('shipmethod');
	var totalWeight = request.getParameter('totalweight');
	var saturdayDelivery = request.getParameter('saturdaydelivery');
	
	nlapiLogExecution('DEBUG', 'getUPSRate', 'Shipping Method: ' + shipMethod + '; Country: ' + shipToCountry + '; State: ' + shipToState + '; City: ' + shipToCity + '; Zip: ' + shipToZip + '; Total Weight: ' + totalWeight + ' Pounds; Saturday Delivery: ' + saturdayDelivery + '; Residential Address: ' + shipToResidentialIndicator);
	
	var packagesArray = getPackagesArray(totalWeight);
	
  var nsfUPSRateTemplateFile = nlapiLoadFile('9598446'); //ups-rate-template-file.xml
  var strUPSXML =  nsfUPSRateTemplateFile.getValue();
  
  strUPSXML = strUPSXML.replace(/<!--SHIPPERACCOUNT-->/g,'XXXXXX'); //replace with UPS Account number
  strUPSXML = strUPSXML.replace(/<!--SHIPPERZIP-->/g,'98134');
  strUPSXML = strUPSXML.replace(/<!--SHIPPERSTATE-->/g,'WA');
  strUPSXML = strUPSXML.replace(/<!--SHIPPERCOUNTRY-->/g,'US');
  
  strUPSXML = strUPSXML.replace(/<!--SHIPTOCOUNTRY-->/g,shipToCountry);
  strUPSXML = strUPSXML.replace(/<!--SHIPTOSTATE-->/g,shipToState);
  strUPSXML = strUPSXML.replace(/<!--SHIPTOCITY-->/g,shipToCity);
  strUPSXML = strUPSXML.replace(/<!--SHIPTOZIP-->/g,shipToZip);
  strUPSXML = strUPSXML.replace(/<!--SHIPTORESIDENTIALINDICATOR-->/g,getResidentialIndicator(shipToResidentialIndicator));
  
  strUPSXML = strUPSXML.replace(/<!--PACKAGES-->/g,packagesArray); // See template XML file for how the package node is constructed. 
  strUPSXML = strUPSXML.replace(/<!--UPSMETHODCODE-->/g,shipMethod);
  strUPSXML = strUPSXML.replace(/<!--SHIPSATURDAY-->/g,saturdayDelivery);
  
  var strUPSURL = 'https://onlinetools.ups.com/webservices/Rate';
  nlapiLogExecution('DEBUG', 'getUPSRate', 'strUPSXML: ' + strUPSXML);
  
  var resp = nlapiRequestURL(strUPSURL,strUPSXML);   
  var strResp = resp.getBody();  
  nlapiLogExecution('DEBUG', 'getUPSRate', 'respDoc: ' + strResp);
  var respDoc = nlapiStringToXML(strResp);   
  
  // Check if there is an error coming from UPS.
  var detailNode = nlapiSelectNode(respDoc,"//detail");
  if (detailNode != null) {
    var errorNodes = nlapiSelectNode(detailNode, "//err:Errors");                        
    if (errorNodes != null) {
      var errorDescription = nlapiSelectValue(errorNodes,"descendant::err:ErrorDetail/err:PrimaryErrorCode/err:Description");      
      nlapiLogExecution('DEBUG', 'getUPSRate', 'Error: ' + errorDescription);
      response.write(errorDescription);
      return;
    }
  } 
  
  // No error so go about building the rate response. Since the requests are made in Rate mode and not Shop
  // only one record should be returned.
  var rateNodes = nlapiSelectNode(respDoc,"//rate:RatedShipment");
  var contractRate = nlapiSelectValue( rateNodes,"descendant::rate:TotalCharges/rate:MonetaryValue"); 
  nlapiLogExecution('DEBUG', 'getUPSRate', 'Contract Rate: ' + contractRate);  
  response.write(contractRate); //this returns the value of the UPS Rate to the client script to display on the Sales Order
}

//function to return an XML string of package nodes, depending on the number of packages needed
//determined by value of passed totalWeight variable
function getPackagesArray(totalWeight){
	var packageXML = "<Package><PackagingType><Code>00</Code><Description>Unknown packaging type</Description></PackagingType><PackageWeight><UnitOfMeasurement><Code>LBS</Code></UnitOfMeasurement><Weight><!--PACKAGEWEIGHT--></Weight></PackageWeight></Package>";
	var maxWeight = 50; //sets value of max weight permitted for a single package (iClick preference)
	var count = 0;
	var packageWeights = []; //array to house individual package weights
	var packagesXMLString = ""; //returned XML string of all packages
	
	//splits up totalWeight into smaller packages determined by maxWeight value; stores values in array
	while(totalWeight > maxWeight){
		packageWeights[count] = maxWeight;
		count++;
		totalWeight = totalWeight - maxWeight;
	}
	packageWeights[count] = totalWeight;
	
	//for each value in the packageWeights array, inserts that weight value into the packageXML string and then
	//adds that new string to the packagesXMLString
	for(var i = 0; i < packageWeights.length; i++){
		var string = packageXML.replace(/<!--PACKAGEWEIGHT-->/g,packageWeights[i]);
		packagesXMLString += string;
	}	
	
	nlapiLogExecution('DEBUG', 'getPackagesArray', 'Packages XML String: ' + packagesXMLString);
	return packagesXMLString;
}

//returns code for Residential Indicator depending on value of variable
function getResidentialIndicator(code){
	if(code == 1){
		return '<ResidentialAddressIndicator>1</ResidentialAddressIndicator>';
	}
	else{
		return '';
	}
}














