///// PRS /////

sap.ui.define([
	"sap/m/Button",
	"sap/m/ButtonType"
	], function (Button, ButtonType) {
		"use strict";
												//extends default Button control
		return Button.extend("project.fin.control.customButton", {
			
					//adds 2 new icons agregations to metadata
				   metadata: {
				      aggregations: {
				         leftIcon: {
				           type: "sap.ui.core.Icon",
				           multiple: false
				         },
				         rightIcon: {
				           type: "sap.ui.core.Icon",
				           multiple: false
				         }
				       }
				     },
				     
				     //renders html elements of two icon button
			       renderer : function(oRm, oControl){
			        oRm.write("<button");
			        oRm.writeControlData(oControl);
			        oRm.addClass("sapMBtn sapMBtnBase");
			        oRm.addClass("finCustomTeamCalendarBtn");
			        oRm.addClass("sapMBtnEmphasized");
			        oRm.writeClasses();
			        oRm.write(">");
			        oRm.write("<div");
			        oRm.writeStyles();
			        oRm.writeControlData(oControl);
			        oRm.addClass("sapMBtnDefault sapMBtnInner sapMBtnHoverable sapMBtnText sapMFocusable");
			        oRm.writeClasses();
			        oRm.write(">");
			        oRm.write("<span");
			        oRm.addClass("sapMBtnContent");
			        oRm.writeClasses();
			        oRm.write(">");
			        oRm.renderControl(oControl.getAggregation("leftIcon"));
			       	oRm.write("<span>&nbsp&nbsp</span>");
			        oRm.write(oControl.getText());
			       	oRm.write("<span>&nbsp&nbsp&nbsp</span>");
			        oRm.renderControl(oControl.getAggregation("rightIcon"));
			        oRm.write("</span>");
			        oRm.write("</div>");
			        oRm.write("</button>");
			       }
		});
});