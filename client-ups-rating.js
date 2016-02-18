/*******************************/
/* UPS Rating SDK Intergration */
/*******************************/

function pageInit(type){
	var transactionID = nlapiGetFieldValue('tranid');	
	nlapiLogExecution('DEBUG', 'pageInit', 'UPS Rating Script pageInit fired. Transaction ID: ' + transactionID);
	
	//hides the calculator button in the shipping subtab and activate new button
	$('#shippingcost_fs .uir-field-widget').hide();
	
	//add button effects to the new shipping button for mouse down and up plus hover
	$('#calculateShippingButton').mousedown(function(){
		$(this).css("background-image", "linear-gradient(rgb(245,186,109) 2%, rgb(245,186,109) 100%)");
	});	
	$('#calculateShippingButton').mouseup(function(){
		$(this).css("background-image", "linear-gradient(rgb(245,186,109) 2%, rgb(245,128,37) 100%)");
	});	
	$('#calculateShippingButton').hover(function(){
	    $(this).css("background-image", "linear-gradient(rgb(245,128,37) 2%, rgb(245,128,37) 100%)");
	    }, function(){
	    $(this).css("background-image", "linear-gradient(rgb(245,186,109) 2%, rgb(245,128,37) 100%)");
	});
	
	//this configures the button depending on shipcarrier on page load
	//this mirrors the same functionality in the fieldChanged function
	var carrier = nlapiGetFieldText('shipcarrier');
	if(carrier == 'UPS'){
		nlapiDisableField('custbody_iclick_ups_saturday_delivery', false);
		$('#custbody_iclick_ups_saturday_delivery_fs').show();
		$('#custbody_iclick_ups_saturday_delivery_fs_lbl_uir_label').show();
		$('#calculateShippingButton').attr('onclick', 'getUPSRate()');
	}
	else{
		nlapiSetFieldValue('custbody_iclick_ups_saturday_delivery', 'F', false);
		nlapiDisableField('custbody_iclick_ups_saturday_delivery', true);
		$('#custbody_iclick_ups_saturday_delivery_fs').hide();
		$('#custbody_iclick_ups_saturday_delivery_fs_lbl_uir_label').hide();
		$('#calculateShippingButton').attr('onclick', 'ShippingPartners.calculateRates()');
	}		
}

function fieldChanged(type, name, linenum){
	//this will toggle the UPS Saturday Delivery checkbox based on selected Shipping Carrier
	//only shows the UPS Saturday checkbox if UPS is selected
	//changes the onclick function of the shipping button depending on selected carrier
	if(name == "shipcarrier"){
		var shippingCarrier = nlapiGetFieldText('shipcarrier');
		if(shippingCarrier == 'UPS'){
			nlapiDisableField('custbody_iclick_ups_saturday_delivery', false);
			$('#custbody_iclick_ups_saturday_delivery_fs').show();
			$('#custbody_iclick_ups_saturday_delivery_fs_lbl_uir_label').show();
			$('#calculateShippingButton').attr('onclick', 'getUPSRate(); return false;');
		}
		else{
			nlapiSetFieldValue('custbody_iclick_ups_saturday_delivery', 'F', false);
			nlapiDisableField('custbody_iclick_ups_saturday_delivery', true);
			$('#custbody_iclick_ups_saturday_delivery_fs').hide();
			$('#custbody_iclick_ups_saturday_delivery_fs_lbl_uir_label').hide();
			$('#calculateShippingButton').attr('onclick', 'ShippingPartners.calculateRates(); return false;');
		}
	}
	
	//if ship method, ship carrier, or ship address changes, will update the shipping cost to 0.00
	if(name == "shipmethod" || name == "shipcarrier" || name == "shipaddress"){
		nlapiSetFieldValue('shippingcost', '0.00');
		//nlapiLogExecution('DEBUG', 'fieldChanged', 'Field changed: ' + name);
	}	
}

function recalc(){
	nlapiSetFieldValue('shippingcost', '0.00');
}

//converts NetSuite ID to UPS Method Code for use in UPS Request
function getUPSMethodCode(code){
	var UPSMethodCode = '';	
	switch(code){
		case '917':
			UPSMethodCode = '14'; //UPS Next Day Air, Early
			break;
		case '916':
			UPSMethodCode = '01'; //Next Day Air
			break;
		case '915':
			UPSMethodCode = '13'; //Next Day Air Saver
			break;
		case '4':
			UPSMethodCode = '59'; //2nd Day Air AM
			break;
		case '925':
			UPSMethodCode = '02'; //2nd Day Air
			break;
		case '8':
			UPSMethodCode = '03'; //Instead of changing to '12' which is 3 Day Select, changing to to 03 which is Ground, which is special iClick promotion
			break;
		case '914':
			UPSMethodCode = '03'; //Ground
			break;
		case '924':
			UPSMethodCode = '65'; //UPS Saver
			break;
		case '919':
			UPSMethodCode = '11'; //UPS Standard
			break;
		case '920':
			UPSMethodCode = '08'; //UPS Worldwide Expedited
			break;
		case '921':
			UPSMethodCode = '07'; //UPS Worldwide Express
			break;
		case '923':
			UPSMethodCode = '54'; //UPS WorldWide Express Plus
			break;
	}	
	return UPSMethodCode;
}

//converts NetSuite ID to UPS Method Code for use in UPS Request
function getSaturdayDeliveryCode(code){
	var UPSSaturdayDeliveryCode = '';	
	switch(code){
		case 'F':
			UPSSaturdayDeliveryCode = '0'; //False for Saturday Delivery
			break;
		case 'T':
			UPSSaturdayDeliveryCode = '1'; //True for Saturday Delivery
			break;
	}	
	return UPSSaturdayDeliveryCode;
}

//converts NetSuite ID to UPS Method Code for use in UPS Request
function getResidentialIndicatorCode(code){
	var UPSResidentialIndicatorCode = '';	
	switch(code){
		case 'F':
			UPSResidentialIndicatorCode = '0'; //False for Residential Address
			break;
		case 'T':
			UPSResidentialIndicatorCode = '1'; //True for Residential Address
			break;
	}	
	return UPSResidentialIndicatorCode;
}

//used to determine contents of UPS response, if number it is the shipping rate, if not, an error
function isNumber(n){
	return ! isNaN (n-0) && n !== null && n !== "" && n !== false;
}

//converts item weight to pounds. Units for Weight: 1 = lb, 2 = oz, 3 = kg, 4 = g
function convertWeightToPounds(weight, units){
	if(units == "4"){
		//units in grams
		weight = weight * 0.00220462;
		return weight;
	}
	else if(units == "3"){
		//units in kilograms
		weight = weight * 2.20462;
		return weight;
	}
	else if(units == "2"){
		//units in ounces
		weight = weight * 0.0625;
		return weight;
	}
	else{
		//units already in pounds
		return weight;
	}
}

//calculate the total weight of the items in the item list, also includes weight unit conversions depending on destination country
function getTotalItemWeight(){
	var totalWeight = 0;
	var itemCount = nlapiGetLineItemCount('item');
	for(var i=1; i <= itemCount; i++){
		//use Item ID to look up weight on item record since it is not a line item value
		var itemid = nlapiGetLineItemValue('item', 'item', i);		
		var iWeight = parseInt(nlapiLookupField('item', itemid, 'weight')); 
		
		//breaks one iteration of the loop if weight is not set
		if(!iWeight){
			continue;
		}		
		
		//looks up units used for Weight: 1 = lb, 2 = oz, 3 = kg, 4 = g
		var iWeightUnits = nlapiLookupField('item', itemid, 'weightunit');
		
		//converts weight to pounds
		weightPounds = convertWeightToPounds(iWeight, iWeightUnits);
		
		var iQuantity = parseInt(nlapiGetLineItemValue('item', 'quantity', i));
		totalWeight += (weightPounds * iQuantity);
	}
	return totalWeight; 
}

function getUPSRate(){	
	//handling charge is separate from UPS rate, but included here to be used in total shipping cost
	var handlingCharge = 1.15;
	
	//grabbing values from form fields
	var shipToCountry = nlapiGetFieldValue('shipcountry');
	var shipToState = nlapiGetFieldValue('shipstate');
	var shipToCity = nlapiGetFieldValue('shipcity');
	var shipToZip = nlapiGetFieldValue('shipzip');	
	
	var shipToResidentialIndicator = nlapiGetFieldValue('shipisresidential');
	var UPSResidentialIndicatorCode = getResidentialIndicatorCode(shipToResidentialIndicator);
	
    var shippingMethod = nlapiGetFieldValue('shipmethod');
    var UPSMethodCode = getUPSMethodCode(shippingMethod);
    
    var saturdayDelivery = nlapiGetFieldValue('custbody_iclick_ups_saturday_delivery');
    var UPSSaturdayDeliveryCode = getSaturdayDeliveryCode(saturdayDelivery);
    
    var totalWeight = getTotalItemWeight();
    nlapiLogExecution('DEBUG', 'getUPSRate', 'Combined Weight: ' + totalWeight + ' Pounds');
    
    //constructing URL with above values
    var url = '/app/site/hosting/scriptlet.nl?script=59&deploy=1';
    url += '&shipmethod=' + UPSMethodCode;
    url += '&shiptocountry=' + shipToCountry;
    url += '&shiptostate=' + shipToState;
    url += '&shiptocity=' + shipToCity;
    url += '&shiptozip=' + shipToZip;
    url += '&shiptoresidentialindicator=' + UPSResidentialIndicatorCode;
    url += '&totalweight=' + totalWeight;
    url += '&saturdaydelivery=' + UPSSaturdayDeliveryCode;
	
	//Error handling. Country is always required. Zip is only required in countries that have postal codes
    //Otherwise, city is required. State/Province is not required.
    //The following array is an array of all countries that require postal codes:
    var postalCodeCountries = ['DZ', 'AR', 'AM', 'AU', 'AT', 'AZ', 'A2', 'BD', 'BY', 'BE', 'BA', 'BR', 'BN', 'BG', 'CA', 'IC', 'CN', 'CO', 'HR', 'CY', 'CZ', 'DK', 'EC', 'EN', 'EE', 'FO', 'FI', 'FR', 'GE', 'DE', 'GR', 'GL', 'GU', 'GG', 'HO', 'HU', 'IN', 'ID', 'IL', 'IT', 'JP', 'JE', 'KZ', 'KR', 'KO', 'KG', 'LV', 'LI', 'LT', 'LU', 'MK', 'MG', 'M3', 'MY', 'MH', 'MQ', 'YT', 'MX', 'MN', 'ME', 'NL', 'NZ', 'NB', 'NO', 'PK', 'PH', 'PL', 'PO', 'PT', 'PR', 'RE', 'RU', 'SA', 'SF', 'CS', 'SG', 'SK', 'SI', 'ZA', 'ES', 'LK', 'NT', 'SX', 'UV', 'VL', 'SE', 'CH', 'TW', 'TJ', 'TH', 'TU', 'TN', 'TR', 'TM', 'VI', 'UA', 'GB', 'US', 'UY', 'UZ', 'VA', 'VN', 'WL', 'YA'];
	if(shipToCountry == ""){
		nlapiLogExecution('DEBUG', 'getUPSRate', 'Ship To Country not set.');
		alert("Please set the country of the shipping address on the customer record before calculating shipping rates.");
		return;
	}
	else{
		if(postalCodeCountries.indexOf(shipToCountry) >= 0){
			//add error handling for countries that require postal codes
			if(shipToZip == ""){
				nlapiLogExecution('DEBUG', 'getUPSRate', 'Ship To Zip not set.');
				alert("Please set the zip code of the shipping address on the customer record before calculating shipping rates.");
				return;	
			}
		}
		else{
			//add error handling for countries that require city
			if(shipToCity == ""){
				nlapiLogExecution('DEBUG', 'getUPSRate', 'Ship To City not set.');
				alert("Please set the city of the shipping address on the customer record before calculating shipping rates.");
				return;	
			}
		}
		
		//if Ground shipping, set shipping cost to 0 and don't send UPS XML Request
		if(shippingMethod == "914"){
			nlapiSetFieldValue('shippingcost', 0);
			return;
		}	
		
		//Send UPS XML Request
	    var response = nlapiRequestURL(url);
	    var responseBody = response.getBody(); 
	}
	
    
    //if the response is a number, it is the shipping rate, otherwise an error message
    if(isNumber(responseBody) == true){
    	//multiply responseBody by handlingCharge variable
    	var totalCost = Math.round(parseInt(responseBody) * handlingCharge * 100)/100; //rounds response to two decimal places
    	
        nlapiSetFieldValue('shippingcost', totalCost);  
        nlapiLogExecution('DEBUG', 'getUPSRate', 'Suitelet Response: $' + responseBody + "; Total Cost After Markup: $" + totalCost);    	
    }
    else{
    	alert("Error: " + responseBody);
    }
}