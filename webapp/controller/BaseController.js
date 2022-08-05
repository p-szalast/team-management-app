sap.ui.define(["sap/ui/core/mvc/Controller", "sap/ui/core/routing/History", "sap/m/MessageBox", "sap/ui/core/Fragment"], function (
	Controller, History, MessageBox, Fragment) {
	"use strict";

	return Controller.extend("project.fin.controller.BaseController", {
		onInit: function () {
			const oComponent = this.getOwnerComponent();

			this.oResourceBundle = oComponent.getModel("i18n").getResourceBundle();
			this.oConfigModel = oComponent.getModel("config");
			this.oODataModel = oComponent.getModel("oData");
			this.oRouter = oComponent.getRouter();

			const sCurrentHash = this.getRouter().getHashChanger().getHash();
			const sCurrentRoute = this.getRouter().getRouteInfoByHash(sCurrentHash)

			// check in case hash is invalid
			if (sCurrentRoute !== undefined && this._onPatternMatched !== undefined) {
				const sCurrentRouteName = sCurrentRoute.name;
				this.getRouter().getRoute(sCurrentRouteName).attachPatternMatched(this._onPatternMatched, this);
			}
		}, // onInit
		/**
		 * Gets configuration model. 
		 * @function
		 * @return {sap.ui.model.json.JSONModel} config model
		 */
		getConfigModel: function () {
			return this.oConfigModel;
		}, // getConfigModel
		/**
		 * Gets oData model.
		 * @function
		 * @return {sap.ui.model.odata.v2.ODataModel} oData model
		 */
		getODataModel: function () {
			return this.oODataModel;
		}, // getODataModel
		/**
		 * Gets router.
		 * @function
		 * @return {sap.ui.core.routing.Router} router
		 */
		getRouter: function () {
			return this.oRouter;
		}, // getRouter
		/**
		 * Gets text from i18n.
		 * @function
		 * @param {string} i18n text label
		 * @param {array} arguments to replace
		 * @return {string} i18n text
		 */
		getText: function (sName, aArgs) {
			return this.oResourceBundle.getText(sName, aArgs);
		}, // getText
		/*
		 * Get logged user from URL.
		 * @function
		 * @return {string} login of the currently logged-in user
		 */
		getLoggedUser: function () {
			return this.getOwnerComponent().getComponentData().startupParameters.login;
		}, // getLoggedUser

		// #PAS 03.06.2022
		/**
		 *Sets access to subpage only for administrators. If user ist'n administrator, he returns to the main page.
		 *Using (Add below code to suitable controller):
		  	onInit: function () {
				BaseController.prototype.onInit.call(this);
				this.getRouter().getRoute("rout's name").attachMatched(this._onRouteMatched, this);
				this.getView().setVisible(false);
			},
			
			_onRouteMatched: function (oEvent) {
				this.setUserPageAccess();
			},
		 */
		setUserPageAccess: async function (setVisibleBack = true) {
			let sUserLogged = this.getLoggedUser();
			// oUser -> {object} representing a logged user
			let oUser = await this.getApiElements({
				sEntitySet: `/UserSet('${sUserLogged}')`,
				fErrorCallback: null
			});
			// bAdmin -> {boolean} value of user's Admin property
			if (oUser.Admin === false) {
				MessageBox.error(this.getText("administratorAccessOnlyMsg"), {
					onClose: function () {
						this.getRouter().navTo("main");
					}.bind(this)
				});
			} else if (setVisibleBack) {
				this.getView().setVisible(true);
			}
		}, // setUserPageAccess
		// /PAS
		/* 
		 * Closes the dialog.
		 * @param oEvent {sap.ui.base.Event} press event
		 */
		onClose: function (oEvent) {
			const oDialog = oEvent.getSource().getParent();
			oDialog.close();
			oDialog.destroy(); // destroy so that there are no duplicate IDs on next open
		}, // onClose -ABZ
		/* 
		 * Navigation of back button in the views
		 * @function
		 */
		onNavBack: function () {
			const oViewSequence = {
				"addDayOffRequest": "userCalendar",
				"teamCalendar": "userCalendar",
				"userCalendar": "main",
				"admin": "main",
				"addEditTeam": "admin",
				"assignTeam": "admin",
				"addEditUser": "admin"
			};

			const sCurrentHash = this.getRouter().getHashChanger().getHash();
			const sCurrentRoute = this.getRouter().getRouteInfoByHash(sCurrentHash).name;
			const sPreviousRoute = oViewSequence[sCurrentRoute];

			this.getRouter().navTo(sPreviousRoute);
		}, //onNavBack

		// onNavToAdmin: function () {
		// 	this.getRouter().navTo("admin");
		// },
		
		
	
		/**	prs
		 * Navigates to AddDayOffRequestView
		 * @function
		 * @param {string} name of the View to navigate
		 * @param {object} object of settings
		 */
		onNavTo: function(sView, oSettings) {
				this.getRouter().navTo(sView, oSettings);
		},
		///prs end///

		/**
		 * Read oData.
		 * @function
		 * @param sModel {string} oData Model name
		 * @param oContext {object} this
		 * @param sEntitySet {string} Entity set name to Read ex. "/EntitySetName"
		 * @param fSuccessCallback {function} function to call after successful fetch
		 * @param fErrorCallback {function} function to call after failed fetch
		 * @return {promise} result on Read success or error on Read error
		 * Start: MTG 2022-05-29
		 */
		getApiElements: function ({
			sModel = "oData",
			oContext = this,
			sEntitySet = null,
			sTextOnError = this.getText("genericErrorMsg"),
			fErrorCallback = null
		}) {
			return new Promise(function (resolve) {
				oContext.getView().getModel(sModel).read(sEntitySet, {
					success: function (result) {
						if (result.results !== undefined) {
							resolve(result.results);
						} else {
							resolve(result);
						}
					}.bind(oContext),
					error: function (error) {
						if (error != undefined) {
							resolve(error);
							if (sTextOnError !== null) {
								MessageBox.error(sTextOnError + `\n\n${error.statusCode} ${error.statusText}`, {
									closeOnNavigation: false
								});
							}
							if (fErrorCallback !== null) {
								fErrorCallback(); // added error callback and changed to MessageBox -ABZ
							}
						}

					}.bind(oContext)
				});
			}.bind(oContext)).then(resolve => {
				return resolve
			});
		},
		// getApiElements
		// End: MTG

		/**
		 * Update oData.
		 * @function
		 * @param sModel {string} oData Model name
		 * @param oContext {object} this
		 * @param sEntitySet {string} Entity set name to Read ex. "/EntitySetName"
		 * @param oUpdatedLocalModel {object} New updated object
		 * @param sTextOnSuccess {string} Message Toast on success
		 * @param sTextOnError {string} Message Toast on error
		 * @param fSuccessCallback {function} function to call after successful fetch
		 * @param fErrorCallback {function} function to call after failed fetch
		 * @return {promise} result on Update success or error
		 * Start: MTG 2022-05-29
		 */
		updateApiElements: function ({
			sModel = "oData",
			oContext = this,
			sEntitySet = null,
			oUpdatedLocalModel = null,
			sTextOnSuccess = this.getText("genericSuccessMsg"),
			sTextOnError = this.getText("genericErrorMsg"),
			fSuccessCallback = null,
			fErrorCallback = null
		}) {
			return new Promise(function (resolve) {
				oContext.getView().getModel(sModel).update(sEntitySet, oUpdatedLocalModel, {
					merge: true,
					success: function () {
						resolve();

						if (sTextOnSuccess !== null) {
							sap.m.MessageToast.show(sTextOnSuccess);
						}

						if (fSuccessCallback !== null) {
							fSuccessCallback();
						}
					}.bind(oContext),
					error: function (error) {
						resolve(error);

						if (sTextOnError !== null) {
							sap.m.MessageBox.error(sTextOnError + `\n\n${error.statusCode} ${error.statusText}`);
						}

						if (fErrorCallback !== null) {
							fErrorCallback();
						} // added callbacks and changed to MessageBox -ABZ
					}.bind(oContext)
				});
			}.bind(oContext)).then(resolve => {
				return resolve
			});
		},
		// updateApiElements
		// End: MTG

		/**
		 * Create oData.
		 * @function
		 * @param sModel {string} oData Model name
		 * @param oContext {object} this
		 * @param sEntitySet {string} Entity set name to Read ex. "/EntitySetName"
		 * @param oCreatedLocalModel {object} New object to push to oData Model
		 * @param sTextOnSuccess {string} Message Toast on success
		 * @param sTextOnError {string} Message Toast on error
		 * @param fSuccessCallback {function} function to call after successful fetch
		 * @param fErrorCallback {function} function to call after failed fetch
		 * @return {promise} result on Update success or error
		 * Start: MTG 2022-05-29
		 */
		createApiElements: function ({
			sModel = "oData",
			oContext = this,
			sEntitySet = null,
			oCreatedLocalModel = null,
			sTextOnSuccess = this.getText("genericSuccessMsg"),
			sTextOnError = this.getText("genericErrorMsg"),
			fSuccessCallback = null,
			fErrorCallback = null
		}) {
			return new Promise(function (resolve) {
				oContext.getView().getModel(sModel).create(sEntitySet, oCreatedLocalModel, {
					success: function (oData) {
						resolve(oData);

						if (sTextOnSuccess !== null) {
							sap.m.MessageToast.show(sTextOnSuccess);
						}

						if (fSuccessCallback !== null) {
							fSuccessCallback();
						}
					}.bind(oContext),
					error: function (error) {
						resolve(error);

						if (sTextOnError !== null) {
							MessageBox.error(sTextOnError + `\n\n${error.statusCode} ${error.statusText}`);
						}

						if (fErrorCallback !== null) {
							fErrorCallback();
						} // added callbacks and changed to MessageBox -ABZ
					}.bind(oContext)
				});
			}.bind(oContext)).then(resolve => {
				return resolve
			});
		},
		// createApiElements
		// End: MTG

		/**
		 * Remove oData.
		 * @function
		 * @param sModel {string} oData Model name
		 * @param oContext {object} this
		 * @param sEntitySet {string} Entity set name to Read ex. "/EntitySetName"
		 * @param sItemToRemove {string} Item inside Entity set to remove
		 * @param sTextOnSuccess {string} Message Toast on success
		 * @param sTextOnError {string} Message Toast on error
		 * @param fSuccessCallback {function} function to call after successful fetch
		 * @param fErrorCallback {function} function to call after failed fetch
		 * @return {promise} result on Update success or error
		 * Start: MTG 2022-05-29
		 */
		removeApiElements: function ({
			sModel = "oData",
			oContext = this,
			sEntitySet = null,
			sTextOnSuccess = this.getText("genericSuccessMsg"),
			sTextOnError = this.getText("genericErrorMsg"),
			fSuccessCallback = null,
			fErrorCallback = null
		}) {
			return new Promise(function (resolve) {
				oContext.getView().getModel(sModel).remove(sEntitySet, {
					success: function () {
						resolve();

						if (sTextOnSuccess !== null) {
							sap.m.MessageToast.show(sTextOnSuccess);
						}

						if (fSuccessCallback !== null) {
							fSuccessCallback();
						}
					}.bind(oContext),
					error: function (error) {
						resolve(error);

						if (sTextOnError !== null) {
							sap.m.MessageBox.error(sTextOnError + `\n\n${error.statusCode} ${error.statusText}`);
						}

						if (fErrorCallback !== null) {
							fErrorCallback(); // added callbacks and changed to MessageBox -ABZ
						}
					}.bind(oContext)
				});
			}.bind(oContext)).then(resolve => {
				return resolve
			});
		}, //removeApiElements,

		/* begin ABZ
		 * Navigates from one entity in oData to another (and removes duplicates).
		 * @async function
		 * @param {string} entity from which you navigate (WITH SLASH)
		 * @param {sTo} entity to which you navigate (WITHOUT SLASH)
		 * @param {sThrough} entity through which you navigate (WITHOUT SLASH)
		 * @return {array} results of navigation
		 */
		navigateOData: async function (sFrom, sTo, sThrough = "PositionSet") { // added default, everything navigates through Position -ABZ
			const sThroughKey = sThrough.replace("Set", "") + "ID";

			const aThroughs = await this.getApiElements({
				sEntitySet: `${sFrom}/${sThrough}`
			});

			const aPromises = aThroughs.map((oResult) => {
				return this.getApiElements({
					sEntitySet: `/${sThrough}('${oResult[sThroughKey]}')/${sTo}`
				});
			});

			const aResults = await Promise.all(aPromises);
			const sToKey = sTo.replace("Set", "") + "ID";

			const oAlreadyNames = new Set();
			const aResultsWithoutDuplicates = aResults.filter((oResult) => {
				const bRes = !(oAlreadyNames.has(oResult[sToKey]));
				oAlreadyNames.add(oResult[sToKey]);
				return bRes;
			})

			return aResultsWithoutDuplicates;
		}, // end ABZ; navigateOData
		/** mhs+prs
		 * Loads mandatory data for calendars view (more than one view uses it).
		 * @ async function
		 */

		loadCalendarColorsTypesAndLegend: async function () {
			const aColorPalete = this.getConfigModel().getProperty("/aColorPalete");

			let oDayOffTypes = this.getConfigModel().getProperty("/oDayOffTypes");
			if (oDayOffTypes === undefined) {
				oDayOffTypes = await this.getApiElements({
					oContext: this,
					sEntitySet: "/DayOffTypeSet"
				});
				this.getConfigModel().setProperty("/oDayOffTypes", oDayOffTypes);
			}

			let oDayOffColorTypes = this.getConfigModel().getProperty("/oDayOffColorTypes");
			if (oDayOffColorTypes === undefined) {
				oDayOffColorTypes = [];
				let iCounter = 0;
				oDayOffTypes.forEach(function (oDayOffType) {
					oDayOffColorTypes.push({
						"DayOffTypeID": oDayOffType.DayOffTypeID,
						"DayOffColorType": aColorPalete[iCounter % 20],
						"DayOffTypeName": oDayOffType.DayOffTypeName
					});
					iCounter++;
				});

				this.getConfigModel().setProperty("/oDayOffColorTypes", oDayOffColorTypes);
			}

			let aLegendItems = this.getConfigModel().getProperty("/aUserCalendarLegendItems");
			if (aLegendItems === undefined) {
				aLegendItems = [];
				oDayOffColorTypes.forEach(function (oColor) {
					aLegendItems.push({
						DayOffTypeID: oColor.DayOffTypeID,
						DayOffTypeColor: oColor.DayOffColorType,
						DayOffTypeName: oColor.DayOffTypeName
					})
				});
				this.getConfigModel().setProperty("/aUserCalendarLegendItems", aLegendItems);
			}

		}, //end mhs+prs
		/** prs
		 * Opens selected day off details popover.
		 * @function
		 * @param {object} legend button press event
		 */
		showDayOffDetailsPopover: function (oEvent) {
			const oView = this.getView();

			//check if dayoff is clicked
			const oDayOff = oEvent.getParameter("appointment");
			if (!oDayOff) {
				return;
			}

			//gets day off binding context
			const oContext = oDayOff.getBindingContext("config");

			// if (!oDayOff.getSelected() && this._pDetailsPopover) {
			// 	this._pDetailsPopover.then(function (oResponsivePopover) {
			// 		oResponsivePopover.close();
			// 	});
			// 	return;
			// }

			//checks if detail popover is already loaded
			if (!this.pDetailsPopover) {
				//loads detail popover
				this.pDetailsPopover = Fragment.load({
					id: oView.getId(),
					name: "project.fin.view.UserCalendarDetails",
					controller: this
				}).then(function (oResponsivePopover) {
					//adds loaded popover to View as dependent 
					oView.addDependent(oResponsivePopover);
					return oResponsivePopover;
				});
			}

			//opens popover after it is loaded
			this.pDetailsPopover.then(function (oDetailsPopover) {
				oDetailsPopover.setBindingContext(oContext, "config");
				oDetailsPopover.openBy(oDayOff);
			});
		},

		/** prs
		 * Opens calendar legend.
		 * @function
		 * @param {object} legend button press event
		 */
		showLegendPopover: function (oEvent) {
			const oView = this.getView();

			//gets event source (legend button)
			const oSource = oEvent.getSource();

			//checks if legend popover is already loaded
			if (!this._pLegendPopover) {
				//loads legend popover
				this._pLegendPopover = Fragment.load({
					id: oView.getId(),
					name: "project.fin.view.UserCalendarLegend",
					controller: this
				}).then(function (oLegendPopover) {
					//adds legend popover to View as dependent 
					oView.addDependent(oLegendPopover);
					return oLegendPopover;
				});
			}

			this._pLegendPopover.then(function (oLegendPopover) {
				//checks if legend popover is already opened and toggles it
				if (oLegendPopover.isOpen()) {
					oLegendPopover.close();
				} else {
					oLegendPopover.openBy(oSource);
				}
			});
		},
		// PAS 06.06.2022
		/**
		 * Changes the app's mode (dark/light).
		 * @param event "press" fired while pressing the ToggleButton.
		 * Using (Add below code to suitable controller and view):
			onModeChange: function (oEvent) {
				this.changeMode(oEvent);
			},
			<Page>
				<headerContent>
					<ToggleButton press=".onModeChange"/>
					...
		 */

		// /PAS,
		onModeChange: function (oEvent) {
			const bDarkModeEnabled = oEvent.getParameter("state");

			if (bDarkModeEnabled) {
				sap.ui.getCore().applyTheme("sap_fiori_3_dark");
			} else {
				sap.ui.getCore().applyTheme("sap_fiori_3");
			}
		},
		/* begin ABZ
		 * Removes validation properties (ending in "Valid") from an object.
		 * @param oEntry {object} object to remove validation properties from
		 * @return {object} new object
		 */
		removeValid: function (oEntry) {
				const aEntries = Object.entries(oEntry).filter(([sKey, sValue]) => !sKey.endsWith("Valid"));
				return Object.fromEntries(aEntries);
			}
			// end ABZ
	});
});