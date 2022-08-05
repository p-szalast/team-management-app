sap.ui.define([
	"./BaseController",
	"sap/m/MessageBox",
	"sap/ui/core/Fragment",
	"../formatter/validator",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (BaseController, MessageBox, Fragment, validator, Filter, FilterOperator) {
	"use strict";

	return BaseController.extend("project.fin.controller.AddEditTeam", {

		validator: validator,

		onInit: function () {
			BaseController.prototype.onInit.call(this);
			this.getView().setVisible(false);
		},

		_onPatternMatched: function (oEvent) {
			this.setUserPageAccess();
			this.sTeamPath = oEvent.getParameter("arguments").Team;
			this.getUsersIDs();
			this.bEditTeam = this.sTeamPath !== undefined;
			this.getConfigModel().setProperty("/EditTeam", this.bEditTeam);

			if (this.bEditTeam) {
				this.setTeamData();
				this.setPositionData();
			} else {
				this.getConfigModel().setProperty("/addEditTeam", {
					allValid: false
				});
				this.getConfigModel().setProperty("/PositionSet", []);
			}
		},
		/**
		 * Allow global access to all users ID's
		 */
		getUsersIDs: async function () {
			let aData = await this.getApiElements({
				sModel: "oData",
				oContext: this,
				sEntitySet: "/UserSet"
			});
			let aUsersIDs = aData.map(function (o) {
				return o.UserID;
			});
			this._aUsersIDs = aUsersIDs;
		},
		/**
		 * Sets data of the Team to local model 
		 */
		setTeamData: async function () {
			let oTeamData = await this.getApiElements({
				sModel: "oData",
				oContext: this,
				sEntitySet: "/" + this.sTeamPath,
				fErrorCallback: this.onNavBack.bind(this)
			});

			this.getConfigModel().setProperty("/addEditTeam", oTeamData);
			this.getConfigModel().setProperty("/addEditTeam/TeamNameValid", true);
		},
		/**
		 * Sets positions data of the Team to local model
		 * For every position add 2 properties used to distinguish member (FirstName, LastName)
		 */
		setPositionData: async function () {
			let aPositionSetData = await this.getApiElements({
				sModel: "oData",
				oContext: this,
				sEntitySet: "/" + this.sTeamPath + "/PositionSet",
				fErrorCallback: this.onNavBack.bind(this)
			});

			this.getConfigModel().setProperty("/PositionSet", aPositionSetData);
			let aPositionSet = this.getConfigModel().getProperty("/PositionSet");

			let oPositionSetWithNames = await Promise.all(aPositionSet.map(async function (oPosition, index) {
				let sUserID = oPosition.UserID;
				let oUserData = await this.getApiElements({
					sModel: "oData",
					oContext: this,
					sEntitySet: "/UserSet('" + sUserID + "')",
				});
				oPosition.FirstName = oUserData.FirstName;
				oPosition.LastName = oUserData.LastName;
				return oPosition;
			}.bind(this)));
			this.getConfigModel().setProperty("/PositionSet", oPositionSetWithNames);
		},
		/**
		 * Updates team data if in edit mode || Creates team and assoscieted positions
		 * Navigates back to adminView
		 */
		onPressSaveTeam: async function () {
			let oTeamData = this.getConfigModel().getProperty("/addEditTeam");
			oTeamData = this.removeValid(oTeamData);
			if (this.bEditTeam) {
				this.updateApiElements({
					oContext: this,
					sEntitySet: "/" + this.sTeamPath,
					oUpdatedLocalModel: oTeamData,
					sTextOnSuccess: this.getText("teamUpdateSuccessMsg")
				});
			} else {
				this.oTeam = await this.createApiElements({
					oContext: this,
					sEntitySet: "/TeamSet",
					oCreatedLocalModel: oTeamData,
					sTextOnSuccess: this.getText("genericSuccessMsg")
				});
				const aPositionSet = this.getConfigModel().getProperty("/PositionSet");
				aPositionSet.forEach(function (oPosition) {
					oPosition = this.removeValid(oPosition);
					oPosition.TeamID = this.oTeam.TeamID;
					delete oPosition.FirstName;
					delete oPosition.LastName;
					const oTeam = this.createApiElements({
						oContext: this,
						sEntitySet: "/PositionSet",
						oCreatedLocalModel: oPosition,
						sTextOnSuccess: null
					});
				}.bind(this));
			}
			this.onNavBack();
		},
		/**
		 * Removes Team from oData if MessageBox is confirmed
		 * Navigates back to adminView
		 */
		onPressDeleteTeam: function () {
			MessageBox.confirm(this.getText("deleteTeamConfirmationMsg"), {
				onClose: function (oAction) {
					if (oAction === "OK") {
						let aPositionSet = this.getConfigModel().getProperty("/PositionSet");
						aPositionSet.forEach(function (oPosition) {
							oPosition = this.removeValid(oPosition);
							delete oPosition.FirstName;
							delete oPosition.LastName;
							this.removeApiElements({
								oContext: this,
								sEntitySet: "/PositionSet('" + oPosition.PositionID + "')",
								sTextOnSuccess: null
							});
						}.bind(this));
						this.removeApiElements({
							oContext: this,
							sEntitySet: "/" + this.sTeamPath,
							sTextOnSuccess: this.getText("deleteTeamMsg")
						});
						this.onNavBack();
					}
				}.bind(this)
			});
		},
		/**
		 * Removes Position from local model and oData (oData only in edit mode) if MessageBox is confirmed
		 */
		handleDeleteMember: async function (oEvent) {
			const oItem = oEvent.getParameter("listItem");
			const sItemBindingPath = oItem.getBindingContextPath("config");
			const sPositionID = this.getConfigModel().getProperty(sItemBindingPath + "/PositionID");
			const iIndexOfItem = oEvent.getSource().indexOfItem(oItem);

			MessageBox.confirm(this.getText("deleteMemberConfirmationMsg"), {
				onClose: function (oAction) {
					if (oAction === "OK") {
						this.getConfigModel().getProperty("/PositionSet").splice(iIndexOfItem, 1);
						this.getConfigModel().refresh();
						if (this.bEditTeam) {
							this.removeApiElements({
								oContext: this,
								sEntitySet: "/PositionSet('" + sPositionID + "')",
								sTextOnSuccess: this.getText("deletePositionMsg")
							});
						}
					}
				}.bind(this)
			});
		},
		/**
		 * sets inital local model and open dialog to add new position 
		 */
		onAddMemberOpenDialog: function () {
			const sTeamID = this.getConfigModel().getProperty("/addEditTeam/TeamID");
			this.getConfigModel().setProperty("/addPosition", {
				UserID: "",
				TeamID: sTeamID,
				PositionName: "",
				PositionDescription: "",
				allValid: false,
				UserIDValid: false
			});

			if (!this.pDialog) {
				this.pDialog = this.loadFragment({
					name: "project.fin.view.AddPositionDialog"
				});
			}
			this.pDialog.then(function (oDialog) {
				oDialog.open();
			});
		},
		/**
		 * Close dialog
		 */
		onCloseDialog: function () {
			this.byId("addPositionDialog").close();
		},
		//PAS BEGIN
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
		onValueHelpDialogClose: function (oEvent) {
			var sSelectedItemText;
			var oSelectedItem = oEvent.getParameter("selectedItem");

			if (!oSelectedItem) {
				return;
			}
			//PAS END
			sSelectedItemText = oSelectedItem.getTitle() + " (" + oSelectedItem.getInfo() + ")";
			this.getConfigModel().setProperty("/addPosition/UserID", sSelectedItemText);
			validator.validateUserID.call(this, oEvent);
		},

		/**
		 * Creates new Position in oData if in Edit Mode || Adds a new Position to local Model with Name and Surname of selected User
		 */
		onAddPosition: async function () {
            let oNewPosition = this.getConfigModel().getProperty("/addPosition");
            //Setting ID of the user
            let aNewPositionUserID = oNewPosition.UserID.split(" ");
            if (aNewPositionUserID.length === 3) {
                oNewPosition.UserID = aNewPositionUserID[0];
            } else {
                oNewPosition.UserID = aNewPositionUserID.slice(0, 2).join(" ");
            }
            oNewPosition = this.removeValid(oNewPosition);
            if (this.bEditTeam) {
                await this.createApiElements({
                    sModel: "oData",
                    oContext: this,
                    sEntitySet: "/PositionSet",
                    oCreatedLocalModel: oNewPosition,
                    sTextOnSuccess: this.getText("PositionAddedMsg")
                });
                this.setPositionData();
            } else {
                const sUserID = oNewPosition.UserID;
                const oUserData = await this.getApiElements({
                    sModel: "oData",
                    oContext: this,
                    sEntitySet: "/UserSet('" + sUserID + "')",
                });
                oNewPosition.FirstName = oUserData.FirstName;
                oNewPosition.LastName = oUserData.LastName;
                let aPositionSet = this.getConfigModel().getProperty("/PositionSet");
                aPositionSet.push({...oNewPosition
                });
                this.getConfigModel().refresh();
            }
            this.onCloseDialog();
        }
	});
});