sap.ui.define([
	"./BaseController",
	"sap/ui/core/Fragment",
	"../model/formatter"
], function (BaseController, Fragment, formatter) {
	"use strict";

	// mhs 02.06.2022r.
	return BaseController.extend("project.fin.controller.TeamCalendar", {

		formatter: formatter,

		/**
		 * Calls the super onInit function from BaseController
		 * Attachs Pattern
		 */
		onInit: function () {
			BaseController.prototype.onInit.apply(this);
			this.getView().setVisible(false); // don't display view before user validation (if user has any team)
		}, //onInit

		/**
		 * Gets all user teams.
		 * @async function 
		 */
		_onPatternMatched: async function () {
			// make sure, that all nessesary data is loaded
			await this.loadCalendarColorsTypesAndLegend();
			// set calendar views
			this.oCalendar = this.byId("PC1");
			this.oCalendar.setBuiltInViews(["Hour", "Week", "One Month", "Month"]);
			this._setViewsDescription();
			// read user teams
			const aTeams = await this.navigateOData("/UserSet('" + this.getLoggedUser() + "')", "TeamSet", "PositionSet");
			//aTeams.length == 0 means, that currently logged user has no any team
			if (aTeams.length === 0) {
				sap.m.MessageBox.error(this.getText("noTeams"), {
					closeOnNavigation: false,
					onClose: function () {
						this.getRouter().navTo("main");
					}.bind(this)
				});
				return;
			}
			this.getView().setVisible(true);
			this.getConfigModel().setProperty("/aCurrentUserTeams", aTeams);
			this.getConfigModel().setProperty("/CurrentSelectedTeamKey", aTeams[0].TeamID);
			const oToday = this._trimDate(new Date());
			this.getConfigModel().setProperty("/TeamCalendarStartDate", oToday);
			await this._bindCalendar();
		}, //_onObjectMatched

		/**
		 * Sets time in date object to 12:00:00:00 or 0:00:00:00.
		 * @function
		 * @param {Date} oDate date to trim
		 * @return {Date} oDate trimmed date
		 */
		_trimDate: function (oDate) {
			let iStartHour = 0;
			if (oDate.getHours() >= 12) {
				iStartHour = 12;
			}
			oDate.setHours(iStartHour, 0, 0, 0);
			return oDate;
		},

		/**
		 * Changes views description
		 * @function
		 * @private
		 */
		_setViewsDescription: function () {
			this.oCalendar._oViews["Hour"].setProperty("description", this.getText("teamCalendarDay"));
			this.oCalendar._oViews["Week"].setProperty("description", this.getText("teamCalendarWeek"));
			this.oCalendar._oViews["One Month"].setProperty("description", this.getText("teamCalendarMonth"));
			this.oCalendar._oViews["Month"].setProperty("description", this.getText("teamCalendarYear"));
		}, //_setViewsDescription

		/**
		 * Triggered by select change.
		 * Calls bindCalendar function.
		 * @async function
		 */
		onSelectChange: async function () {
			this._bindCalendar();
		}, //onSelectChange

		/**
		 * Takes current selected team from config model and prepares users and their dayoffs.
		 * @async function
		 * @private
		 */
		_bindCalendar: async function () {
			const sPath = "/TeamSet('" + this.getConfigModel().getProperty("/CurrentSelectedTeamKey") + "')";
			const aUsers = await this.navigateOData(sPath, "UserSet", "PositionSet");
			let aTeamUsers = [];

			await Promise.all(aUsers.map(async(oUser) => {
				const aDayOffs = await this.getApiElements({
					oContext: this,
					sEntitySet: "/UserSet('" + oUser.UserID + "')/DayOffSet"
				});
				const aPositions = await this.getApiElements({
					oContext: this,
					sEntitySet: "/UserSet('" + oUser.UserID + "')/PositionSet"
				});
				oUser.Position = "";
				aPositions.forEach(function (oPosition) {
					if (oPosition.TeamID === this.getConfigModel().getProperty("/CurrentSelectedTeamKey")) {
						oUser.Position += oPosition.PositionName + "\n";
					}
				}.bind(this));
				oUser.DayOffs = aDayOffs;
				aTeamUsers.push(oUser);
			}));

			this.getConfigModel().setProperty("/aTeamUsers", aTeamUsers);
			this.getConfigModel().setProperty("/PopoverVisibleCounter", 2);
		}, //_bindCalendar

		/**
		 * Fired if a day off (appointment) is selected.
		 * First sets the property, then calls the function from BaseController.
		 * @function
		 * @param {sap.ui.base.Event} oEvent
		 */
		handleDayOffSelect: function (oEvent) {
			this.getConfigModel().setProperty("/PopoverVisibleCounter", 0);
			this.getConfigModel().setProperty("/PopoverBtnsVisibility", false);
			this.showDayOffDetailsPopover(oEvent);
		}, //handleAppointmentSelect

		/**
		 * Fired if an interval was selected in the calendar header or in the row.
		 * Checks the popover visible counter state. (explained below)
		 * Goes one interval deeper.
		 * @function
		 * @param {sap.ui.base.Event} oEvent
		 */
		handleIntervalSelect: function (oEvent) {
			let iPopoverVisibleCounter = this.getConfigModel().getProperty("/PopoverVisibleCounter");
			if (iPopoverVisibleCounter === 0) { // 0 -> popover is open, doesn't change interval
				return;
			}
			if (iPopoverVisibleCounter === 1) { // 1 -> popover has been closed, doesn't change interval
				iPopoverVisibleCounter++;
				this.getConfigModel().setProperty("/PopoverVisibleCounter", iPopoverVisibleCounter);
				return;
			}
			// iPopoverVisibleCounter >= 2, popover is closed, changes interval
			const oCalendar = oEvent.getSource();
			const sCurrentViewKey = oCalendar.getViewKey();
			const oSelectedDate = oEvent.getParameters("startDate").startDate;
			if (["Week", "One Month"].includes(sCurrentViewKey)) {
				oCalendar.setViewKey("Hour");
				oCalendar.setStartDate(oSelectedDate);
			} else if (["Month"].includes(sCurrentViewKey)) {
				oCalendar.setViewKey("One Month");
				oCalendar.setStartDate(oSelectedDate);
			}

		}, //handleIntervalSelect

		/**
		 * Fired when the viewKey property was changed by user interaction.
		 * Sets the start date property in order to correctly view display.
		 * @function
		 * @param {sap.ui.base.Event} oEvent
		 */
		handleViewChange: function (oEvent) {
			const oCalendar = oEvent.getSource();
			const sCurrentViewKey = oCalendar.getViewKey();
			let oDate = new Date();
			this.getConfigModel().setProperty("/TeamCalendarStartDate", undefined);
			if (sCurrentViewKey === "Month") {
				oDate.setMonth(0);
				this.getConfigModel().setProperty("/TeamCalendarStartDate", oDate);
			} else {
				oDate = this._trimDate(oDate);
				this.getConfigModel().setProperty("/TeamCalendarStartDate", oDate);
			}
			this.getConfigModel().setProperty("/PopoverVisibleCounter", 2);
		}, //handleViewChange

		/**
		 * This event will be fired after the popover is closed.
		 * Changes the value of popover visible counter.
		 * @function
		 */
		handlePopoverClose: function () {
			this.getConfigModel().setProperty("/PopoverVisibleCounter", 1);
		}, //handlePopoverClose

		/**
		 * Fired when the startDate property was changed while navigating in the PlanningCalendar.
		 * Sets the popover visible counter.
		 * @function
		 */
		handleDateChange: function () {
				this.getConfigModel().setProperty("/PopoverVisibleCounter", 2);
			} //handleDateChange
	});
});