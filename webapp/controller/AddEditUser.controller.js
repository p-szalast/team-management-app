// #PAS
sap.ui.define([
	"./BaseController", "sap/ui/core/Fragment", "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator", "sap/m/MessageBox", "../formatter/validator"
], function (BaseController, Fragment, Filter, FilterOperator, MessageBox, validator) {
	"use strict";

	return BaseController.extend("project.fin.controller.AddEditUser", {
		validator: validator,

		onInit: function () {
			BaseController.prototype.onInit.call(this);
			this.getView().setVisible(false);
		},

		_onPatternMatched: function (oEvent) {
			this.setUserPageAccess();
			this.showElementsOnPage(oEvent);
		},

		/**
		 * Sets the visibility the form's elements depending on the argument "?query" of the router's parameters.
		 */
		showElementsOnPage: function (oEvent) {
			// oQueryArg -> {object} contains value of argument "?query" of the router's parameters
			const oQueryArg = oEvent.getParameter("arguments")["?query"];
			// oQueryArg.mode -> value {string} of key "mode" from oQueryArg object
			this.sMode = oQueryArg.mode;

			this.getConfigModel().setProperty("/addEditUser", {});
			this.getConfigModel().setProperty("/addEditUser/allValid", false);

			this.bAddMode = this.sMode === 'add';
			this.getConfigModel().setProperty("/mode", this.bAddMode);
			this.getConfigModel().setProperty("/editUserFormShown", this.bAddMode);
			this.getConfigModel().setProperty("/removeUserBtnEnabled", false);
		},

		/**
		 * Opens the ValueHelpDialog to select UserID.
		 * @param event "valueHelpRequest" fired while opening the ValueHelpDialog
		 */
		onValueHelpRequest: function (oEvent) {
			let sInputValue = oEvent.getSource().getValue();
			const oView = this.getView();

			if (!this._pValueHelpDialog) {
				this._pValueHelpDialog = Fragment.load({
					id: oView.getId(),
					name: "project.fin.view.ValueHelpDialogUserID",
					controller: this
				}).then(function (oDialog) {
					oView.addDependent(oDialog);
					return oDialog;
				});
			}
			this._pValueHelpDialog.then(function (oDialog) {
				oDialog.open(sInputValue);
			});
		},

		/**
		 * Opens the ValueHelpDialog to select UserID.
		 * @param event "liveChange" fired while typping in the input of the ValueHelpDialog
		 */
		onValueHelpDialogSearch: function (oEvent) {
			let sValue = oEvent.getParameter("value");

			const oUserIDFilter = new Filter("UserID", FilterOperator.Contains, sValue);
			const oFirstNameFilter = new Filter("FirstName", FilterOperator.Contains, sValue);
			const oLastNameFilter = new Filter("LastName", FilterOperator.Contains, sValue);

			const oFilters = new Filter({
				filters: [
					oUserIDFilter,
					oFirstNameFilter,
					oLastNameFilter
				],
				and: false
			});

			oEvent.getSource().getBinding("items").filter(oFilters);
		},

		/**
		 * Closes the ValueHelpDialog.
		 * @param event "cancel" or "confirm" fired while closing the ValueHelpDialog
		 * oSelectedItem -> {object} represents a selected item of the ValueHelpDialog's list
		 */
		onValueHelpDialogClose: function (oEvent) {
			let sSelectedItemText;
			let oSelectedItem = oEvent.getParameter("selectedItem");

			if (!oSelectedItem) {
				return;
			}

			sSelectedItemText = oSelectedItem.getTitle();
			this.byId("userIDinput").setSelectedKey(sSelectedItemText);

			this.onBindPersonalDataForm(sSelectedItemText);
		},

		/**
		 * Gets the typed text in the input.
		 * @param event "liveChange" fired while typping in the userIDinput
		 */
		onUserIDinputTypping: function (oEvent) {
			let sInputValue = oEvent.getSource().getValue();
			this.onBindPersonalDataForm(sInputValue);
		},

		/**
		 * Gets the key of selected item.
		 * @param event "suggestionItemSelected" fired while selecting the suggestion item
		 */
		onSuggestionItemSelected: function (oEvent) {
			let sSelectedKey = oEvent.getSource().getSelectedKey();
			this.onBindPersonalDataForm(sSelectedKey);
		},

		/**
		 * Bindes data depending on the selected user.
		 * @param {string} value with selected user's ID.
		 */
		onBindPersonalDataForm: async function (sValue) {
			let sLoggedUserID = this.getLoggedUser();
			// aData -> {array} with all users
			let aData = await this.getApiElements({
				sModel: "oData",
				oContext: this,
				sEntitySet: "/UserSet"
			});

			// aUsersID -> {array} with ID's from all users.
			let aUsersID = aData.map(function (o) {
				return o.UserID;
			});

			// checks if selected user's ID exist in the database
			let bUserExistence = aUsersID.indexOf(sValue) >= 0;
			let bLoggedUser = sLoggedUserID === sValue;

			this.getConfigModel().setProperty("/editUserFormShown", bUserExistence);
			this.getConfigModel().setProperty("/removeUserBtnEnabled", bUserExistence && !bLoggedUser);

			if (bUserExistence) {
				let oUserData = await this.getApiElements({
					sModel: "oData",
					oContext: this,
					sEntitySet: `/UserSet('${sValue}')`
				});
				Object.keys(oUserData).forEach((sKey) => {
					oUserData[sKey + "Valid"] = true;
				})
				oUserData.allValid = true;
				this.getConfigModel().setProperty("/addEditUser", oUserData);
			}
		},

		/**
		 * Saves the changes: updates or creates the userdepending on the argument "?query" of the router's parameters.
		 */
		onSaveUserPress: function () {
			const oUserLocalData = this.getConfigModel().getProperty("/addEditUser");
			const oUserLocalDataClean = this.removeValid(oUserLocalData);

			if (this.bAddMode) {
				this.createApiElements({
					sEntitySet: "/UserSet",
					oCreatedLocalModel: oUserLocalDataClean,
					sTextOnSuccess: null,
					fSuccessCallback: function () {
						this.getConfigModel().setProperty("/addEditUser", {
							allValid: false
						});
						MessageBox.success(this.getText("userAddedSuccessMsg"));
					}.bind(this)
				});
			} else {
				this.updateApiElements({
					sModel: "oData",
					oContext: this,
					sEntitySet: `/UserSet('${oUserLocalData.UserID}')`,
					oUpdatedLocalModel: oUserLocalData,
					sTextOnSuccess: this.getText("userEditedSuccessMsg"),
					fSuccessCallback: function () {
						this.setUserPageAccess();
					}.bind(this)
				})
			}
		},
		/**
		 * Removes the user and his daysOff and positions.
		 */
		onRemoveUser: async function () {
			let oUserLocalData = this.getConfigModel().getProperty("/addEditUser");

			let aDayOffSet = await this.getApiElements({
				sEntitySet: `/UserSet('${oUserLocalData.UserID}')/DayOffSet`
			});

			let aPositionSet = await this.getApiElements({
				sEntitySet: `/UserSet('${oUserLocalData.UserID}')/PositionSet`
			});

			MessageBox.confirm(this.getText("confirmUserDeletionMsg", [oUserLocalData.UserID]), {
				onClose: function (sAction) {
					if (sAction === "OK") {
						this.removeApiElements({
							sModel: "oData",
							oContext: this,
							sEntitySet: `/UserSet('${oUserLocalData.UserID}')`,
							sTextOnSuccess: this.getText("userRemovedSuccessMsg"),
							fSuccessCallback: function () {
								this.getConfigModel().setProperty("/addEditUser", {
									allValid: false
								});
							}.bind(this)
						});

						aDayOffSet.forEach(function (oDayOff) {
							this.removeApiElements({
								sEntitySet: `/DayOffSet('${oDayOff.DayOffID}')`
							});
						}.bind(this));

						aPositionSet.forEach(function (oPosition) {
							this.removeApiElements({
								sEntitySet: `/PositionSet('${oPosition.PositionID}')`
							});
						}.bind(this));

						this.onBindPersonalDataForm();
					}
				}.bind(this)
			});
		},

		/**
		 * Exit from addEditUser view.
		 */
		onCancelEditUser: function () {
			this.getConfigModel().setProperty("/addEditUser", {});
			this.onNavBack();
		}
	});
});
// /PAS