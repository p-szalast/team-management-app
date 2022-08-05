/// PRS ///

sap.ui.define([
	"./BaseController",
	"sap/ui/core/Fragment",
	"../model/formatter",
	"sap/m/Button",
	"sap/m/ButtonType",
	"sap/m/MessageBox"
], function (BaseController, Fragment, formatter, Button, ButtonType, MessageBox) {
	"use strict";

	return BaseController.extend("project.fin.controller.UserCalendar", {
		formatter: formatter,
		
		/**
		 * app configuration before rendering
		 * @ async function
		 */
		onBeforeRendering: async function () {
			// 1) sets current date to config model as calendar start date
			let dDate = new Date();
			this.getConfigModel().setProperty("/calendarStartDate", dDate);

			// 2) loads calendar colors, types and legend
			await this.loadCalendarColorsTypesAndLegend();

			// 3) adjusts addRequest button to user's device
			this.handleAddDayOffRequestBtnText();
		},

		/**
		 * handles team calendar button functionality and gets current user day offs on every pattern matched
		 * @ async function
		 */
		_onPatternMatched: function () {
			//checks if current user belongs to any team (for handling team calendar button functionality)
			this.getNumberOfUserTeams();
				
			//(if no data already) on each pattern matched launches function getting current user day off schedule
			if (!this.getConfigModel().aCurrentUserDayOffs) {
				// gets current user day offs
				this._getCurrentUserDayOffs();

				///////////////////////////////////////////////////////////////////////////////////////////////////				
				//Functionality moved to BaseController

				// gets day off types from oData and creates template
				// this._getDayOffTypeTemplate();
			}
		},

		// _getDayOffTypeTemplate: async function () {
		// 	const aDayOffTypes = await this.getApiElements({
		// 			oContext: this,
		// 			sEntitySet: "/DayOffTypeSet"
		// 		});

		// 	const oTemplate = aDayOffTypes.reduce((obj, item) => Object.assign(obj, {[item.DayOffTypeID]: item.DayOffTypeName }), {});

		// 	this.getConfigModel().setProperty("/oDayOffTypes", oTemplate);

		// 	this._createDayOffTypesColorsTemplate();

		// },

		// _createDayOffTypesColorsTemplate: function () {
		// 	const aColorPalete = this.getConfigModel().getProperty("/aColorPalete")
		// 	const oDayOffTypesTemplate = this.getConfigModel().getProperty("/oDayOffTypes");
		// 	const aDayOffTypesIDs = Object.keys(oDayOffTypesTemplate);

		// 	// const oDayOffColorTypes = aDayOffTypesIDs.reduce((obj, item, index) => Object.assign(obj, {[item]: `Type${index + 1 < 10 ? ("0" + (index + 1)) : index + 1}`}), {});
		// 	const oDayOffColorTypes = aDayOffTypesIDs.reduce((obj, item, index) => Object.assign(obj, {
		// 		[item]: `${aColorPalete[index]}`
		// 	}), {});

		// 	this.getConfigModel().setProperty("/oDayOffColorTypes", oDayOffColorTypes);

		// 	this._createLegendItems(oDayOffColorTypes);
		// },

		// _createLegendItems: function (oDayOffColorTypes) {

		// 	const oDayOffTypes = this.getConfigModel().getProperty("/oDayOffTypes");
		// 	const aLegendItems = [];

		// 	for (const [key, value] of Object.entries(oDayOffColorTypes)) {

		// 		aLegendItems.push({
		// 			DayOffTypeID: key,
		// 			DayOffTypeColor: value,
		// 			DayOffTypeName: oDayOffTypes[key]
		// 		})
		// 	}

		// 	this.getConfigModel().setProperty("/aUserCalendarLegendItems", aLegendItems);
		// },

		////////////////////////////////////////////////////////////////////////////////////////////////////////////////

		/**
		 * Gets looged user day off schedule and saves it to local model
		 * @function
		 */
		_getCurrentUserDayOffs: async function () {
			//gets logged user
			this.sLoggedUser = this.getLoggedUser();

			//gets logged user day off array from oData
			const aCurrentUserDayOffs = await this.getApiElements({
				oContext: this,
				sEntitySet: "/UserSet('" + this.sLoggedUser + "')/DayOffSet",
				sTextOnError: this.getText("downloadDayOffsErrorMsg")
			});

		// reseting hours, minutes and seconds for calendar fullday day offs display
		aCurrentUserDayOffs.forEach(function(oDayOff) {
			if (oDayOff.DateTimeTo.getHours() === 23 && oDayOff.DateTimeTo.getMinutes() === 59 && oDayOff.DateTimeTo.getSeconds() === 59) {
				oDayOff.DateTimeTo.setHours(0, 0, 0, 0);
			}
		})

			//sets array of day offs with updated property DayOffTypeName to local model (property binded to Signle Planning Calendar aggregation "appointments")
			this.getConfigModel().setProperty("/aCurrentUserDayOffs", aCurrentUserDayOffs);
		},
		
		/**
		 * Gets number of user teams and sets it to config model.
		 * @function
		 */
		getNumberOfUserTeams: async function() {
			//gets count of logged user's teams
			this.sLoggedUser = this.getLoggedUser();
			this.sAssignedTeams = await this.getApiElements({ 
					oContext: this,
					sEntitySet: "/UserSet('" + this.sLoggedUser + "')/PositionSet/$count",
					sTextOnError: this.getText("getCurrentUserErrorMsg")
				});
		},

		/**
		 * adjusts addRequest button to user's device
		 * @function
		 */
		handleAddDayOffRequestBtnText: function () {
			//sets addRequest button text to icon only on mobiles
			if (sap.ui.Device.system.phone) {
				this.getView().byId("legendBtn").setText(this.getText("legend"));
				this.getView().byId("addDayOffRequestBtn").setText("");
			}
		},

		/**
		 * Navigates to team day offs calendar View. If user does not belong to any team disables the functionality button
		 * @function
		 */
		onNavToTeamCalendar: function () {
			if (this.sAssignedTeams == 0) {
				sap.m.MessageBox.information(this.getText("teamCalendarBtnNoTeamMsg"));
			} else {
				this.onNavTo("teamCalendar");
			}
		},
		
		onMoreLinks: function(oEvent) {
			const oDate = oEvent.getParameter("date");
			const oSinglePlanningCalendar = this.getView().byId("UserDayOffsCallendar");
			const oDayView = oSinglePlanningCalendar.getViews()[1];

			oSinglePlanningCalendar.setSelectedView(oDayView);

			this.getConfigModel().setProperty("/calendarStartDate", oDate);
		},


		/**
		 * Loads day off details popover
		 * @function
		 */
		handleDayOffSelect: function (oEvent) {
			//shows edit and delete button
			this.getConfigModel().setProperty("/PopoverBtnsVisibility", true);

			//loads details popover
			this.showDayOffDetailsPopover(oEvent);
		},

		/**
		 * Navigates to addDayOffRequest View with "edit" query
		 * @function
		 */
		handleEditButton: function () {
			//closes active popover
			this.closeDetailPopover();

			//gets selected day off ID
			const sDayOffID = this.getSelectedDayOffID();

			//navTo another View and passes selected day off ID
			this.getRouter().navTo("addDayOffRequest", {
				"?query": {
					edit: "DayOffSet('" + sDayOffID + "')"
				}
			});

		},

		/**
		 * Deletes selected day off
		 * @function
		 */
		handlePopoverDeleteButton: function () {
			// closes active popover
			this.closeDetailPopover();

			// gets selected day off ID
			const sDayOffID = this.getSelectedDayOffID();

			// deletes selected day off from oData
			this.removeApiElements({
				oContext: this,
				sEntitySet: "/DayOffSet('" + sDayOffID + "')",
				sTextOnSuccess: this.getText("deleteDayOffSuccessMsg"),
				sTextOnError: this.getText("deleteDayOffErrorMsg")
			});

			// refreshes current user day offs
			this._getCurrentUserDayOffs();
		},

		/**
		 * Gets selected day off ID
		 * @function
		 * @return {string} selected day off ID
		 */
		getSelectedDayOffID: function () {
			const oDetailsPopover = this.getView().byId("dayOffDetailsPopover");
			const oDayOff = oDetailsPopover.getBindingContext("config").getObject();
			const sDayOffID = oDayOff.DayOffID;
			return sDayOffID;
		},

		/**
		 * Closes DayOff details popover
		 * @function
		 */
		closeDetailPopover: function () {
			const oDetailsPopover = this.getView().byId("dayOffDetailsPopover");
			oDetailsPopover.close();
		}

	});
});