sap.ui.define([], function () {
	"use strict";
	return {
		/**
		 * Returns a Day Off Type Name for calendars.
		 * @function
		 * @param {string} Day Off Type ID
		 * @return {string} Day Off Type Name
		 */
		dayOffTitle: function (sID) { //mhs+prs
			const oDayOffTypes = this.getView().getModel("config").getProperty("/oDayOffTypes");
			let sDayOffTypeName = "";
			oDayOffTypes.forEach(function (oDayType) {
				if (oDayType.DayOffTypeID == sID) {
					sDayOffTypeName = oDayType.DayOffTypeName;
				}
			});
			return sDayOffTypeName;
		},

		/**
		 * Returns a Day Off Color Type for calendars.
		 * @function
		 * @param {string} Day Off Type ID
		 * @return {string} Day Off Type Color
		 */
		dayOffColor: function (sID) { //mhs+prs
			const oDayOffColorTypes = this.getView().getModel("config").getProperty("/oDayOffColorTypes");
			const defaultColor = this.getView().getModel("config").getProperty("/defaultColor")
			let sColor = defaultColor;
			oDayOffColorTypes.forEach(function (oDayColor) {
				if (oDayColor.DayOffTypeID == sID) {
					sColor = oDayColor.DayOffColorType;
				}
			});
			return sColor;
		}

	};
});