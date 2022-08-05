sap.ui.define([
	"./BaseController",
	"sap/m/MessageBox"
], function (BaseController, MessageBox) {
	"use strict";

	return BaseController.extend("project.fin.controller.Main", {
		_onPatternMatched: function () {
			this.validateUserAfterLogin();
			
		},
		
		//MTG Start 06.06.2022
		// Validate if user exist on every single landing on this Main page
		// If not dont show personal data
		validateUserAfterLogin: async function () {
			let oReturnMessageFromApi = await this.getApiElements({
				sEntitySet: "/UserSet('" + this.getLoggedUser() + "')",
				sTextOnError: null
			})
			if (oReturnMessageFromApi.UserID !== undefined) {
				this.getView().bindElement("oData>/UserSet('" + this.getLoggedUser() + "')");
				this.getEveryTeamBasedOnSingleUser();
			}
			
		},//MTG End
		
		//MTG Start 06.06.2022
		getEveryTeamBasedOnSingleUser: async function () {
			let oUserTeams = await this.navigateOData("/UserSet('" + this.getLoggedUser() + "')", "TeamSet", "PositionSet");
			var oUserTeamsAndPositionsLocal = [];
			if(oUserTeams.length === 0){
				this.getView().getModel("TeamBasedOnUserID").setProperty("/Teams", {});
				return;
			}
			oUserTeams.map(async function (oItem) {
				if(oItem.TeamID !== undefined){
					let oTeamPositions = await this.getApiElements({
						sEntitySet: "/TeamSet('" + oItem.TeamID + "')/PositionSet",
						sTextOnError: null
					});
					if(oTeamPositions !== undefined || oTeamPositions.statusCode !== undefined){
						if(oTeamPositions.statusCode != 200){
							oTeamPositions.filter(function (oPositionItem) {
	
								if (oPositionItem.UserID == this.getLoggedUser()) {
									let oListDisplayPositonsAndTeams = {
										TeamName: oItem.TeamName,
										PositionName: oPositionItem.PositionName,
										PositionDescription: oPositionItem.PositionDescription
									};
									oUserTeamsAndPositionsLocal.push(oListDisplayPositonsAndTeams);
			
								}
							}.bind(this));
							this.getView().getModel("TeamBasedOnUserID").setProperty("/Teams", oUserTeamsAndPositionsLocal);
						}else{
							this.getView().getModel("TeamBasedOnUserID").setProperty("/Teams", {});
						}
					}
				}else{
					this.getView().getModel("TeamBasedOnUserID").setProperty("/Teams", {});
				}
				
				
			}.bind(this));
		}//MTG End
	});
});