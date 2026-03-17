import { Request, Response } from "express";

import axios from "./callaxios";
import { stat } from "fs";

var callback: string = "" + process.env.CALLBACK;
callback = callback.trim();
var client_id: string =  "" + process.env.CLIENT_ID;
client_id = client_id.trim();

var authen_url: string = "https://imauth.bora.dopa.go.th/api/v2/oauth2/auth/";

var scope: string = "" + process.env.scope;
scope = scope.trim();

var istate: string = "" + process.env.STATE;
istate = istate.trim();

export default {
    _get : async (req: Request, res: Response) => {
        while (callback.includes('?')) {
            callback = callback.substring(0, callback.length-1);
        }
        callback = callback.trim().replace(/ /g, '').trim();
        console.log(callback)
        var state = req.query.state;
        if (!state || state===''){ state=istate; } 

        try {
            let API_DB_URL = "" + process.env.API_DB_URL || "http://app:3000/";
            let headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
            let option = {
                method: 'GET',
                headers: headers,
            }
            let res_auth = await fetch(`${API_DB_URL}/api/thaid_states?state=${state}`, option);
            if (res_auth.status == 200) {
                let rs = await res_auth.json().catch(() => []) || [];
                let data = rs?.data || [];
                console.log(data)
                if (data != null && data.length==1){
                    scope = data[0].scope || scope;
                    if (scope !== "") {
                        try {
                            var s = JSON.parse(scope).data || [];
                            scope = s.join(" ");
                        } catch (error) {
                            console.log(error);
                            state = "webapp";
                            scope = "pid name";
                        }
                    } else {
                        state = "webapp";
                        scope = "pid name";
                    }
                } else if (state === "webapp") {
                    state = "webapp";
                    scope = "pid name";
                } 
            } else {
                console.log("Error: " + res_auth.status);
                state = "webapp";
                scope = "pid name";
            }
        } catch (error) {
            console.log(error);
        }
        console.log(state)
        var response_type = "code";
        console.log(response_type)
        var inuseurl = `${authen_url}?response_type=${response_type}&client_id=${client_id}&redirect_uri=${callback}&scope=${scope}&state=${state}`;
        console.log(inuseurl)
        res.redirect(inuseurl);
    }
}