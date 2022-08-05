sap.ui.define([
	"./BaseController",
	"sap/ui/core/format/DateFormat",
	"sap/m/MessageBox"
], function (BaseController, DateFormat, MessageBox) {
	"use strict";

	return BaseController.extend("project.fin.controller.Admin", {
		onInit: function(){
			BaseController.prototype.onInit.call(this);
			this.getView().setVisible(false);
		},
		onAfterRendering: function(){
			const oVizFrame = this.getView().byId("idVizFrameColumn");
	        const oPopOver = this.getView().byId("idPopOverColumn");
			
	        oPopOver.connect(oVizFrame.getVizUid());
		},

		_onPatternMatched: function () {
			this.showTeamsWithUsers();
			this.vizFrameDataSource();
			this.sTeamPath = undefined
			this.setUserPageAccess();
			this.removeSelectionsList("idListAdmin");
		},

		onNavToEditTeam: function () {
			if (this.sTeamPath !== undefined) {
				this.removeSelectionsList("idListAdmin");
				this.getRouter().navTo("addEditTeam", {
					Team: "TeamSet('" + this.sTeamPath + "')"
				});
			} else {
				MessageBox.error(this.getText("selectItem"))
			}
		},
		
		/// prs
		// onNavToAddTeam: function () {
		// 	this.getRouter().navTo("addEditTeam");
		// },

		// onNavToAssignTeam: function () {
		// 	this.getRouter().navTo("assignTeam");
		// },
		/// prs

		// #PAS 1.06.2022
		onNavToAddUser: function () {
			this.getRouter().navTo("addEditUser", {
				"?query": {
					"mode": "add"
				}
			});
		},

		/**
		 * PAS
		 * Navigation to AddEditUser.view.xml with optional parameter.
		 */
		onNavToEditUser: function () {

			this.getRouter().navTo("addEditUser", {
				"?query": {
					"mode": "edit"
				}
			});
		},

		removeSelectionsList: function (sID) {
			this.getView().byId(sID).removeSelections()
		},

		//MTG Start: 03.06.2022
		// Get TeamSet based on PositionSet. This function Set property on two local properties inside "TeamBasedOnUserID" model :
		// 1. Property TeamsWithUsers {bolean} contains all teams but inside this prop we declare param "hasUser" with information if team contains users or not . 
		// 2. Property TeamsQuantity {intiger} contains sum of all teams and teams without users. 
		showTeamsWithUsers: async function(){
			
			let oPositionSetSetModel = await this.getApiElements({
				sEntitySet: "/PositionSet"
			});
			let oTeamSetModel = await this.getApiElements({
				sEntitySet: "/TeamSet"
			});

			let oTeamID = [];
			let oTeamsWithUssers = [];
			let oItemCoppy = [];

			oPositionSetSetModel.filter(function (oItem) {
				if (oTeamID.includes(oItem.TeamID) === false) {
					oTeamID.push(oItem.TeamID);
					oItemCoppy.push(oItem);
				}
			});

			oTeamSetModel.filter(function (oItemTeam) {
				oItemCoppy.filter(function (oItemPosition) {
					if (oItemTeam.TeamID === oItemPosition.TeamID) {
						oTeamsWithUssers.push(oItemTeam.TeamID);
					}
				})

			});

			for (let i = 0; i < oTeamSetModel.length; i++) {

				if (oTeamsWithUssers.includes(oTeamSetModel[i].TeamID)) {
																				
					oTeamSetModel[i].hasUser = true;
				} else {
					oTeamSetModel[i].hasUser = false;
				}
			}
			let sTeamQuantity = {
				WithNoUsers: oTeamSetModel.length - oTeamsWithUssers.length,
				All: oTeamSetModel.length
			}

			this.getView().getModel("TeamBasedOnUserID").setProperty("/TeamsWithUsers", oTeamSetModel);
			this.getView().getModel("TeamBasedOnUserID").setProperty("/TeamsQuantity", sTeamQuantity);

		}, //MTG End: 06.06.2022

		//MTG Start: 03.06.2022
		// this function loop over Entities TeamSet > PositionSet > UserSet > DayOffSet
		// 1. Get all teams 
		// 2. Get Users from team for each teamID 
		// 3. Get DayOff for each User by UserID 
		// 4. Validate DayOff type if !== "on" sum days off and return days (from miliseconds)  
		// 5. Create Prop "vizFrame" inside local model ("TeamBasedOnUserID")
		// vizFrame contains DayOffSet grouped by users and teams, timeCount, TeamName
		vizFrameDataSource: async function () {

			let oTeamSetModel = await this.getApiElements({
				sEntitySet: "/TeamSet"
			});
			
			let oTeamsWithSumDaysArray = []
			let oTeamsWithSumDaysSingleObj = {}
			
			await Promise.all(oTeamSetModel.map(async function(oTeamSetItem){
				
				let oUserTeams = await this.navigateOData("/TeamSet('"+oTeamSetItem.TeamID+"')", "UserSet", "PositionSet");
			
				
				await Promise.all(oUserTeams.map(async function(oUserTeamItem){
					
					let oUserSetModel = await this.getApiElements({
						sEntitySet: "/UserSet('" + oUserTeamItem.UserID + "')/DayOffSet"
					});
					
					oUserSetModel.filter(function(oUserSetItem){
						
						if(oUserSetItem.DayOffTypeID !== "on"){
								let oDateFrom = new Date (oUserSetItem.DateTimeFrom);
								let iDateFromMs = oDateFrom.getTime();
								
								let oDateTo = new Date (oUserSetItem.DateTimeTo);
								// let iDateToMs = oDateTo.getTime();			 // prs
								let iDateToMs = oDateTo.getTime() + 1000;   	// added 1000ms to get full day from oData 
																				// (in oData full days stored from 00:00:00 to 23:59:59)
								
								let iCount = iDateToMs - iDateFromMs;
								let iCountResult = this.countMsToHours(iCount);
								
								if(oTeamSetItem.TeamName in oTeamsWithSumDaysSingleObj){
									oTeamsWithSumDaysSingleObj[oTeamSetItem.TeamName] += iCountResult;
								} else {
									oTeamsWithSumDaysSingleObj[oTeamSetItem.TeamName] = iCountResult;
								}
						}
					}.bind(this));
				}.bind(this)));
			}.bind(this)));
			
			for (const [key, value] of Object.entries(oTeamsWithSumDaysSingleObj)) {
				 oTeamsWithSumDaysArray.push({
					 TeamName: key,
					 timeCount: value
				})
			}
			
			this.getView().getModel("TeamBasedOnUserID").setProperty("/vizFrame", oTeamsWithSumDaysArray);
		},//MTG End: 06.06.2022
		
		//MTG Start: 03.06.2022
		// converting milliseconds to hours based on function param
		countMsToHours: function (miliseconds) {
			let seconds = (miliseconds / 1000);
			let minutes = (seconds / 60);
			let hours = (minutes / 60);
			let days = (hours / 24);
			return days;
		}, //MTG End: 06.06.2022

		//MTG Start: 07.06.2022
		// get selected UserID based on pressed item from Admin list
		onListItemPress: function (oEvent) {
				let sSelectedContextPath = undefined;
				sSelectedContextPath = oEvent.getSource().getSelectedItem().getBindingContext("TeamBasedOnUserID").getPath();
				let oModel = this.getView().getModel("TeamBasedOnUserID").getProperty(sSelectedContextPath);
				this.sTeamPath = oModel.TeamID;
			} //MTG End: 07.06.2022

	});
});