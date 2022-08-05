// begin ABZ
sap.ui.define([
	"./BaseController", "../formatter/validator", "sap/ui/model/Filter", "sap/ui/model/FilterOperator", "sap/m/ObjectAttribute",
	"sap/m/MessageBox"
], function (BaseController, validator, Filter, FilterOperator, ObjectAttribute, MessageBox) {
	"use strict";

	return BaseController.extend("project.fin.controller.AssignTeam", {
		onInit: function () {
			BaseController.prototype.onInit.call(this);

			this.getConfigModel().setProperty("/assignTeamPositionValid", false);
			this.getConfigModel().setProperty("/assignTeamPositions", {});
			this.getConfigModel().setProperty("/assignTeamBtnEnabled", false);
			this.getConfigModel().setProperty("/assignTeamPositionDescription", "");
			this.getConfigModel().setProperty("/assignTeamSearchField", "");
		},
		/*
		 * Checks if any items are selected. If so, displays a confirmation box.
		 * @param fCallback {function} callback to execute after user confirmed
		 */
		_confirmLeave: function (fCallback) {
			const oUserList = this.byId("assignTeamUserList");

			if (oUserList.getSelectedItems().length !== 0) {
				MessageBox.confirm(this.getText("confirmCloseMsg"), {
					onClose: function (sAction) {
						if (sAction === "OK") {
							fCallback();
						} else {}
					}.bind(this)
				})
			} else {
				fCallback();
			}
		},
		/*
		 * Selects or deselect an user item depending on if it has a position assigned or not.
		 */
		_makeSelection: function () {
			const oUserList = this.byId("assignTeamUserList");
			const sUserId = this.getConfigModel().getProperty("/assignTeamCurrentUserId");
			const oUserItem = this.getConfigModel().getProperty("/assignTeamCurrentUserItem");

			const sFinalPosition = this.getConfigModel().getProperty(`/assignTeamPositions/${sUserId}`);
			oUserList.setSelectedItem(oUserItem, sFinalPosition !== undefined && sFinalPosition.length > 0);

			const aSelectedItems = oUserList.getSelectedItems();
			this.getConfigModel().setProperty("/assignTeamBtnEnabled", aSelectedItems.length > 0);

		},
		/*
		 * Checks if logged user is admin. 
		 */
		_onPatternMatched: async function () {
			this.getView().setVisible(false);

			this.getODataModel().attachEventOnce("batchRequestCompleted", () => {
				this._updatePositions();
				this.iListLength = this.byId("assignTeamUserList").getItems().length;
			}); // show current positions on page start after oData is loaded

			this.setUserPageAccess(false);

			const aTeams = await this.getApiElements({
				sEntitySet: "/TeamSet"
			});
			if (aTeams.length === 0) {
				MessageBox.error(this.getText("noTeamsMsg"), {
					onClose: () => {
						this.onNavBack();
					}
				});
			} else {
				this.getView().setVisible(true);
			}
		},
		/*
		 * Updates shown positions that users already hold in the selected team.
		 */
		_updatePositions: async function () {
			const oUserList = this.byId("assignTeamUserList");
			const aUserItems = oUserList.getItems();

			let sSelectedTeam = this.getConfigModel().getProperty("/assignTeamSelectedTeam");
			if (sSelectedTeam === undefined) {
				const aTeams = await this.getApiElements({
					sEntitySet: "/TeamSet"
				});

				sSelectedTeam = aTeams[0].TeamID;
			}

			// map user items to promises containing their positions
			const aPromises = aUserItems.map((oUserItem) => {
				const sUserId = oUserItem.getIntro();

				oUserItem.destroyAttributes();

				return this.getApiElements({
					sEntitySet: `/UserSet('${sUserId}')/PositionSet`
				})
			});
			const aUserPositions = await Promise.all(aPromises);

			aUserPositions.forEach((aIndividualUserPositions, iIndex) => {
				// for each user, filter their positions to only contain those from the selected team
				const aIndividualUserPositionsInSelectedTeam = aIndividualUserPositions.filter((oIndividualUserPosition) =>
					oIndividualUserPosition.TeamID === sSelectedTeam);

				// add title only if there are positions
				if (aIndividualUserPositionsInSelectedTeam.length > 0) {
					const oAttribute = new ObjectAttribute({
						title: this.getText("currentPositionsLabel")
					});
					oAttribute.addStyleClass("finBoldText");

					aUserItems[iIndex].addAttribute(oAttribute);
				}

				// for each position, add an ObjectAttribute
				aIndividualUserPositionsInSelectedTeam.forEach((oIndividualUserPositionInSelectedTeam) => {
					const oAttribute = new ObjectAttribute({
						text: oIndividualUserPositionInSelectedTeam.PositionName
					});

					aUserItems[iIndex].addAttribute(oAttribute);
				});
			});
		},
		/*
		 *  Returns a Promise that checks if the user list has been already updated with filters.
		 * @return {Promise}
		 */
		_waitUntilFilterEmpty: function () {
			const oList = this.byId("assignTeamUserList");
			return new Promise((resolve) => {
				const iIntervalId = setInterval(() => {
					if (this.iListLength === oList.getItems().length) {
						resolve();
						clearInterval(iIntervalId);
					}
				}, 10);
			});
		},
		/*
		 * Helper "formatter" to get user position from an object of users.
		 * @param oObject {object} object with user IDs as keys & arrays [position, position description] as values
		 * @param sUserId {string} user ID
		 * @return {string} user position
		 */
		getPositionFromObject: function (oObject, sUserId) {
			const oValue = oObject[sUserId];

			if (oValue !== undefined) {
				return oValue[0];
			}
		},
		/*
		 * Assigns users to the selected team.
		 */
		onAssign: async function () {
			const oUserList = this.byId("assignTeamUserList");
			const aUserPaths = oUserList.getSelectedContextPaths(); // has to be done this way, otherwise it doesn't see filtered out items
			const oAssignedPositions = this.getConfigModel().getProperty("/assignTeamPositions");

			const aPromises = aUserPaths.map((sUserPath) => {
				let sUserId = sUserPath.match(/^\/UserSet\('(.*)'\)$/)[1];
				sUserId = window.decodeURIComponent(sUserId);
				const sTeamId = this.getConfigModel().getProperty("/assignTeamSelectedTeam");
				const [sPosition, sPositionDescription] = oAssignedPositions[sUserId];

				const oNewEntry = {
					PositionName: sPosition,
					UserID: sUserId,
					TeamID: sTeamId
				};

				if (sPositionDescription.trim().length > 0) {
					oNewEntry.PositionDescription = sPositionDescription;
				}

				return this.createApiElements({
					sEntitySet: "/PositionSet",
					oCreatedLocalModel: oNewEntry,
					sTextOnSuccess: this.getText("assignSuccessMsg")
				});
			})
			await Promise.all(aPromises);

			const oBinding = oUserList.getBinding("items");
			oBinding.filter([]);
			await this._waitUntilFilterEmpty();
			this.getConfigModel().setProperty("/assignTeamSearchField", "");
			this._updatePositions();
			this.onDeselectAll();
		},
		/*
		 * Closes the dialog and clears the model.
		 */
		onClose: function (oEvent) {
			this.getConfigModel().setProperty("/assignTeamPosition", "");
			this.getConfigModel().setProperty("/assignTeamPositionDescription", "");
			BaseController.prototype.onClose.call(this, oEvent);
		},
		/*
		 * Deselects all items in user list and clears the model.
		 */
		onDeselectAll: function () {
			const oUserList = this.byId("assignTeamUserList");
			const aUserItems = oUserList.getSelectedItems();

			aUserItems.forEach((oUserItem) => {
				oUserList.setSelectedItem(oUserItem, false);
			})

			this.getConfigModel().setProperty("/assignTeamPositions", {});
			this.getConfigModel().setProperty("/assignTeamBtnEnabled", false);
		},
		/*
		 * Clears the list and navigates back.
		 */
		onNavBack: function () {
			this._confirmLeave(() => {
				this.onDeselectAll();
				BaseController.prototype.onNavBack.call(this);
			});
		},
		/*
		 * Temporarily assigns a position to user, closes the dialog and selects the item in the list.
		 * @param oEvent {sap.ui.base.Event} press event
		 */
		onSavePosition: function (oEvent) {

			const sPosition = this.getConfigModel().getProperty("/assignTeamPosition");
			const sPositionDescription = this.getConfigModel().getProperty("/assignTeamPositionDescription");

			const sUserId = this.getConfigModel().getProperty("/assignTeamCurrentUserId");
			this.getConfigModel().setProperty(`/assignTeamPositions/${sUserId}`, [sPosition, sPositionDescription]);

			this.getConfigModel().setProperty("/assignTeamPosition", "");
			this.getConfigModel().setProperty("/assignTeamPositionDescription", "");
			this.getConfigModel().setProperty("/assignTeamPositionValid", false);
			this.getConfigModel().refresh(true); // model must be refreshed for formatter to work
			this.onClose(oEvent);
			this._makeSelection();

			this._updatePositions();
		},
		/*
		 * Searches the user list for the inputted name or ID.
		 * @param oEvent {sap.ui.base.Event} search event
		 */
		onSearch: async function (oEvent) {
			const sQuery = oEvent.getParameter("query");

			let oFilter;
			if (sQuery.trim().length > 0) {
				const aFiltersToAdd = ["FirstName", "LastName", "UserID"].map((sPath) => new Filter(sPath, FilterOperator.Contains, sQuery));

				oFilter = new Filter({
					filters: aFiltersToAdd,
					and: false
				});

				this.byId("assignTeamUserList").getBinding("items").filter(oFilter);
			} else {
				this.byId("assignTeamUserList").getBinding("items").filter([]);
				await this._waitUntilFilterEmpty();
			}

			this._updatePositions();
		},
		/*
		 * Updates user positions and deselect all users after changing team.
		 * @param oEvent {sap.ui.base.Event} select change event
		 */
		onSelectTeam: function (oEvent) {
			const sPreviousTeam = oEvent.getParameter("previousSelectedItem").getKey();
			const sCurrentTeam = oEvent.getParameter("selectedItem").getKey();
			this.getConfigModel().setProperty("/assignTeamSelectedTeam", sPreviousTeam);

			this._confirmLeave(() => {
				this.getConfigModel().setProperty("/assignTeamSelectedTeam", sCurrentTeam);
				this._updatePositions();
				this.onDeselectAll();
			});
		},
		/*
		 * Selects or deselects the clicked item.
		 * @param oEvent {sap.ui.base.Event} press event
		 */
		onUserPress: async function (oEvent) {
			const sEventType = oEvent.getId();
			// if event is "select", source is list, so we need to get list item from parameter
			// if event is "press", source is list item
			const oUserItem = (sEventType === "select" ? oEvent.getParameter("listItem") : oEvent.getSource());
			const oUserList = this.byId("assignTeamUserList");
			let aSelectedItems = oUserList.getSelectedItems();

			let bIsSelected = aSelectedItems.includes(oUserItem);
			// if event is "select", item is already in selected items
			// if event is "press", item is NOT in selected items
			if (sEventType === "select") {
				bIsSelected = !bIsSelected;
			}

			const sUserId = oUserItem.getIntro();
			this.getConfigModel().setProperty("/assignTeamCurrentUserId", sUserId);
			this.getConfigModel().setProperty("/assignTeamCurrentUserItem", oUserItem);
			if (!bIsSelected) {
				const oDialog = await this.loadFragment({
					name: "project.fin.view.AssignTeamDialog"
				});
				oDialog.open();
			} else {
				const oUserObject = this.getConfigModel().getProperty("/assignTeamPositions");
				delete oUserObject[sUserId];
				this.getConfigModel().setProperty("/assignTeamPositions", oUserObject);

				this._makeSelection();
				this.getConfigModel().refresh(true); // model must be refreshed for the formatter to work
			}
		},
		validator: validator
	});
});
// end ABZ