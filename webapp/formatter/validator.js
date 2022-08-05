// begin ABZ
sap.ui.define([], function () {
	"use strict";

	return {
		/*
		    Sets property xValid on config model for the property x, and checks if all inputs
		    in the group are valid.
		*/
		_validate: function (bIsValid, sPath, sBasePath, sFieldGroupId) {
			this.getConfigModel().setProperty(sPath, bIsValid);

			const aInputs = this.getView().getControlsByFieldGroupId(sFieldGroupId).filter((oElement) => oElement.isA("sap.m.Input"));
			const bAreAllValid = aInputs.every((oInput) => oInput.getValueState() === "None");

			this.getConfigModel().setProperty(sBasePath + "/allValid", bAreAllValid);
		},
		validateEmail: function (oEvent) {
			const sFieldGroupId = oEvent.getSource().getFieldGroupIds()[0];
			const sValue = oEvent.getParameter("value");
			const sPath = oEvent.getSource().getBindingPath("value");
			const sValidPath = sPath + "Valid";
			const sBasePath = sPath.split("/").slice(0, -1).join("/");

			// pattern: characters@characters.characters
			const bIsEmailValid = /^[a-z]+[0-9]*\.?[a-z]+[0-9]*@[a-z]+[0-9]*\.{1}[a-z]+$/.test(sValue);					//pas/prs
			this.validator._validate.call(this, bIsEmailValid, sValidPath, sBasePath, sFieldGroupId);
		},
		validateNotEmpty: function (oEvent) {
			const sFieldGroupId = oEvent.getSource().getFieldGroupIds()[0];
			const sValue = oEvent.getParameter("value");
			const sPath = oEvent.getSource().getBindingPath("value");
			const sValidPath = sPath + "Valid";
			const sBasePath = sPath.split("/").slice(0, -1).join("/");

			this.validator._validate.call(this, sValue.trim().length > 0, sValidPath, sBasePath, sFieldGroupId);
		},
		
		validatePhone: function (oEvent) {
			const sFieldGroupId = oEvent.getSource().getFieldGroupIds()[0];
			const sValue = oEvent.getParameter("value");
			const sPath = oEvent.getSource().getBindingPath("value");
			const sValidPath = sPath + "Valid";
			const sBasePath = sPath.split("/").slice(0, -1).join("/");

			// pattern: +48123456 or 123456 or 123-456 or 123 456
			const bIsPhoneValid = /^\+?[0-9-]+$/.test(sValue);
			this.validator._validate.call(this, bIsPhoneValid, sValidPath, sBasePath, sFieldGroupId);
		},
		// end ABZ
		
		
		
		validateName: function (oEvent) {
			const sFieldGroupId = oEvent.getSource().getFieldGroupIds()[0];
			const sValue = oEvent.getParameter("value");
			const sPath = oEvent.getSource().getBindingPath("value");
			const sValidPath = sPath + "Valid";
			const sBasePath = sPath.split("/").slice(0, -1).join("/");
			
	//// prs mod. ////////
			const bIsNameValid = !(/[^a-zA-ZąęśćńółżźĄĘŚĆŃÓŁŻŹ!-]+/.test(sValue)) && sValue !== "";
			this.validator._validate.call(this, bIsNameValid, sValidPath, sBasePath, sFieldGroupId);
		},
	//// prs mod. ////////
	
	
		validateAddress: function (oEvent) {
			const sFieldGroupId = oEvent.getSource().getFieldGroupIds()[0];
			const sValue = oEvent.getParameter("value");
			const sPath = oEvent.getSource().getBindingPath("value");
			const sValidPath = sPath + "Valid";
			const sBasePath = sPath.split("/").slice(0, -1).join("/");
			
	//// prs mod. ////////
			const bIsAddressValid = !(/[^a-zA-Z0-9ąęśćńółżźĄĘŚĆŃÓŁŻŹ./ \-]+/.test(sValue)) && sValue !== "";
			this.validator._validate.call(this, bIsAddressValid, sValidPath, sBasePath, sFieldGroupId);
		},
	//// prs mod. ////////
	
		validateCityNCountry: function (oEvent) {
			const sFieldGroupId = oEvent.getSource().getFieldGroupIds()[0];
			const sValue = oEvent.getParameter("value");
			const sPath = oEvent.getSource().getBindingPath("value");
			const sValidPath = sPath + "Valid";
			const sBasePath = sPath.split("/").slice(0, -1).join("/");
			
	//// prs mod. ////////
			const bIsAddressValid = !(/[^a-zA-Z0-9ąęśćńółżźĄĘŚĆŃÓŁŻŹ./ -]+/.test(sValue)) && sValue !== "";
			this.validator._validate.call(this, bIsAddressValid, sValidPath, sBasePath, sFieldGroupId);
		},
	//// prs mod. ////////
		
		// Begin JRB
		validateUserID: function (oEvent) {
				switch (oEvent.sId) {
				case "suggestionItemSelected":
					if (oEvent.getParameter("selectedItem") === null) {
						return;
					}
					this.sValue = oEvent.getParameter("selectedItem").getProperty("key");
					break;
				case "liveChange":
					this.sValue = oEvent.getParameter("value");
					break;
				case "confirm":
					this.sValue = oEvent.getParameter("selectedItem").getTitle();
					break;
				default:
					break;
				}
				const sFieldGroupId = oEvent.getSource().getFieldGroupIds()[0];
				const sPath = "/addPosition/UserID";
				const sValidPath = sPath + "Valid";
				const sBasePath = sPath.split("/").slice(0, -1).join("/");
				const aUsersIDs = this._aUsersIDs;
				const bIsIDValid = aUsersIDs.includes(this.sValue);
				this.validator._validate.call(this, bIsIDValid, sValidPath, sBasePath, sFieldGroupId);
			}
			//End JRB
	};
});