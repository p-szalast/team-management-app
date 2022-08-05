// begin ABZ
sap.ui.define([
	"./BaseController"
], function (BaseController) {
	"use strict";

	return BaseController.extend("project.fin.controller.AddDayOffRequest", {
		/*
		 * Initializes or clears the current day off request data in config model.
		 */
		_clearCurrentFormInModel: function () {
			const oTomorrow = new Date();
			oTomorrow.setDate(oTomorrow.getDate() + 1);
			// by default workday 8-16
			oTomorrow.setHours(16, 0, 0);
			const oToday = new Date();
			oToday.setHours(8, 0, 0);

			const oTimeFrom = new Date();
			oTimeFrom.setHours(8, 0, 0);
			const oTimeTo = new Date();
			oTimeTo.setHours(16, 0, 0);

			const sCurrentDayOffTypeID = this.getConfigModel().getProperty("/dayOffRequestCurrent/DayOffTypeID");
			this.getConfigModel().setProperty("/dayOffRequestCurrent", {
				DateFrom: oToday,
				DateTo: oTomorrow,
				Date: oToday,
				TimeFrom: oTimeFrom,
				TimeTo: oTimeTo,
				Comment: "",
				DayOffTypeID: sCurrentDayOffTypeID
			});
		},
		/* 
		 * Checks if URL has "edit" search parameter. If so, fills the form with the data from the selected request.
		 * @param oEvent {sap.ui.base.Event} pattern match event 
		 */
		_onPatternMatched: async function (oEvent) {
			const oArgs = oEvent.getParameters("arguments").arguments;

			if (oArgs["?query"] !== undefined && "edit" in oArgs["?query"]) {
				this.bEditMode = true;
				this.getConfigModel().setProperty("/dayOffRequestEditMode", true);

				const sRequestPath = oArgs["?query"].edit;
				const oPossibleRequest = this.getODataModel().getProperty("/" + sRequestPath);
				if (oPossibleRequest === undefined) { // if oData is not already loaded from previous view, GET data
					const oData = await this.getApiElements({
						sModel: "oData",
						oContext: this,
						sEntitySet: "/" + sRequestPath,
						sTextOnError: this.getText("invalidDayOffRequestMsg"),
						fErrorCallback: function () {
							this.onNavBack("userCalendar");
						}.bind(this)
					});

					this.getConfigModel().setProperty("/dayOffRequestCurrent", this._processData(oData));
				} else {
					this.getConfigModel().setProperty("/dayOffRequestCurrent", this._processData(oPossibleRequest));
				}

			} else {
				this.bEditMode = false;
				this.getConfigModel().setProperty("/dayOffRequestEditMode", false);

				this._clearCurrentFormInModel();
			}

			this.getConfigModel().setProperty("/dayOffRequestMinDate", new Date());
			this.getConfigModel().setProperty("/dayOffRequestTimeValid",
				true);
		},
		/*
		 * Processes DateTimeFrom and DateTimeTo values from oData into DateTo/DateFrom/TimeFrom/TimeTo/Date.
		 * @param {object} DayOff entry from oData
		 * @return {object} processed entry
		 */
		_processData: function (oEntry) {
			const oDateTimeFrom = oEntry.DateTimeFrom;
			const oDateTimeTo = oEntry.DateTimeTo;

			const oProcessedEntry = {
				DayOffID: oEntry.DayOffID,
				UserID: oEntry.UserID,
				DateFrom: oDateTimeFrom,
				DateTo: oDateTimeTo,
				Date: oDateTimeFrom,
				TimeFrom: oDateTimeFrom,
				TimeTo: oDateTimeTo,
				Comment: oEntry.Comment,
				DayOffTypeID: oEntry.DayOffTypeID
			}

			return oProcessedEntry;
		},
		/*
		 * Saves data from the form to oData (either updates or creates a new entry).
		 */
		_save: function () {
			const oNewEntry = this.getConfigModel().getProperty("/dayOffRequestCurrent");

			if (oNewEntry.DayOffTypeID !== "on") { // if not "odbiór nadgodzin" then whole days, exact time doesn't matter
				
				// oNewEntry.DateFrom.setHours(0, 0, 0);				//prs
				// oNewEntry.DateTo.setHours(0, 0, 0);
			//prs	
				//declares fullDay (without a second - which is later added in admin view to get real full day in chart)
				oNewEntry.DateFrom.setHours(0, 0, 0, 0);			// wyzerowane milisekundy
				oNewEntry.DateTo.setHours(23, 59, 59, 0);			// declares fullDay
			//prs

				oNewEntry.DateTimeFrom = oNewEntry.DateFrom;
				oNewEntry.DateTimeTo = oNewEntry.DateTo;
				 
			} else {
				oNewEntry.DateTimeFrom = oNewEntry.Date;
				oNewEntry.DateTimeFrom.setHours(oNewEntry.TimeFrom.getHours(), oNewEntry.TimeFrom.getMinutes(), 0, 0); //// prs mod
				oNewEntry.DateTimeTo = new Date(oNewEntry.Date.getTime());
				oNewEntry.DateTimeTo.setHours(oNewEntry.TimeTo.getHours(), oNewEntry.TimeTo.getMinutes(), 0, 0); //// prs mod
			}

			const sDayOffId = oNewEntry.DayOffID;
			// deletes fields that don't exist in oData
			["DateFrom", "DateTo", "TimeFrom", "TimeTo", "Date"].forEach((sField) => delete oNewEntry[sField]);
			
			oNewEntry.UserID = this.getLoggedUser();
			if (this.bEditMode) {
				this.updateApiElements({
					sModel: "oData",
					oContext: this,
					sEntitySet: `/DayOffSet('${sDayOffId}')`,
					oUpdatedLocalModel: oNewEntry,
					sTextOnSuccess: this.getText("dayOffEditedSuccessMsg")
				});
			} else {
				this.createApiElements({
					sModel: "oData",
					oContext: this,
					sEntitySet: "/DayOffSet",
					oCreatedLocalModel: oNewEntry,
					sTextOnSuccess: this.getText("dayOffAddedSuccessMsg")
				});
			}
		},
		/*
		 * Changes start date of DateTo when DateFrom is changed.
		 */
		onDateFromChange: function () {
			const oCurrentDateFrom = this.getConfigModel().getProperty("/dayOffRequestCurrent/DateFrom");
			this.getConfigModel().setProperty("/dayOffRequestMinDate", new Date(oCurrentDateFrom.getTime()));
			const oCurrentDateTo = this.getConfigModel().getProperty("/dayOffRequestCurrent/DateTo");

			if (oCurrentDateFrom >= oCurrentDateTo) {
				const oDayAfterDate = new Date(oCurrentDateFrom.getTime());
				oDayAfterDate.setDate(oDayAfterDate.getDate() + 1);
				this.getConfigModel().setProperty("/dayOffRequestCurrent/DateTo", oDayAfterDate);
			}
		},
		/*
		 * Saves data and navigates back to previous screen.
		 */
		onSave: function () {
			this._save();
			this.onNavBack();
		},
		/*
		 * Saves data + clears the form.
		 */
		onSaveAndAddNext: function () {
			this._save();
			this._clearCurrentFormInModel();
		},
		/*
		 * Sets the minimum date to to DateFrom at request type change.
		 * @param oEvent {sap.ui.base.Event} select event
		 */
		onSelectDayOffType: function (oEvent) {
			if (oEvent.getParameter("selectedItem").getKey() !== "on") {
				const oMinDate = this.getConfigModel().getProperty("/dayOffRequestCurrent/DateFrom");

				this.getConfigModel().setProperty("/dayOffRequestMinDate", oMinDate);
			}
		},
		/*
		 * Checks if time to is later than time from and validates it.
		 */
		onTimeChange: function () {
			const oTimeFrom = this.getConfigModel().getProperty("/dayOffRequestCurrent/TimeFrom");
			const oTimeTo = this.getConfigModel().getProperty("/dayOffRequestCurrent/TimeTo");

			// create 2 Date objects with the same date to only compare times
			const oTempDateFrom = new Date(1, 1, 1);
			oTempDateFrom.setHours(oTimeFrom.getHours());
			oTempDateFrom.setMinutes(oTimeFrom.getMinutes());
			const oTempDateTo = new Date(1, 1, 1);
			oTempDateTo.setHours(oTimeTo.getHours());
			oTempDateTo.setMinutes(oTimeTo.getMinutes());

			this.getConfigModel().setProperty("/dayOffRequestTimeValid", oTempDateFrom < oTempDateTo);
		}
	});
});
// end ABZ