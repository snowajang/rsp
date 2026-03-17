import { Request, Response } from "express";
import axios from "./callaxios";
import qs from 'qs';
import { AxiosError } from "axios";

var api_key: string = ""+process.env.API_KEY ;
api_key = api_key.trim();
var callback: string = ""+process.env.CALLBACK ;
callback = callback.trim();
var client_id: string = ""+process.env.CLIENT_ID ;
client_id = client_id.trim();
var client_secret: string = ""+process.env.CLIENT_SECRET;
client_secret = client_secret.trim();
var confirm_url = "https://imauth.bora.dopa.go.th/api/v2/oauth2/token/";

export default {
    _get: async (req: Request, res: Response) => {
        while (callback.includes('?')) {
            callback = callback.substring(0, callback.length-1);
        }
        callback = callback.trim().replace(/ /g, '').trim(); 
        console.log("callback[",`[${callback}]`, "]")

        var code: string = req.query.code?.toString() || "";
        var error: string = req.query.error?.toString() || "";
        var error_description: string = req.query.error_description?.toString() || "";
        var state: string = req.query.state?.toString() || "";

        var error_msg;
        if (error!=null) {
            error_msg = (error + " " + error_description).trim();
            if (error_msg === "undefined") {
                error_msg = null;
            }
            if (error_msg === "null") {
                error_msg = null;
            }
            if (error_msg?.trim() === "") {
                error_msg = null;
            }
            // if (error_msg != null && error_msg === "") {
            //     error_msg = null;
            // }
        }
        try {
            if (code && state) {
                let client_base64: string = Buffer.from(`${client_id}:${client_secret}`, 'utf8').toString('base64');
                
                //let client_base64: string = "Tm1KSVVteEJiSEV4YW5GVWJFcDBNM2xFWjNGSldYWlZWMFUxYm1WVVdHazpkM1ozUmpCWFpVdHhTblJ5T0VaUlUxYzRWRkIwY0ZGSmQxcE5jalUxYUZkWldqVm9Zelp2Tnc=";
                let authorization: string = "Basic " + client_base64;
                let headers = {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': authorization.replace(/\r\n/g,'').trim(),
                    'Connection':'close'
                }
                const input = {
                    "code" : code,
                    "grant_type":"authorization_code",
                    "redirect_uri": callback
                };

                let option = {
                    method: 'POST',
                    headers: headers,
                    body: qs.stringify(input)
                }

                
                let thaid:any = {};
                
                try {            
                    console.log(confirm_url);
                    let vres = await fetch(confirm_url, option);
                    thaid = await vres.json().catch(() => {}) || {};
                    console.log("thaid data", thaid);
                } catch (error) {      
                    console.log(error); 
                    error_msg = error;
                }
                let scope = "";
                if (state!=="apipro" && error_msg == null) {
                    try {

                        let vurl = process.env.page || "http://localhost/thaid";

                        let API_DB_URL = "" + process.env.API_DB_URL || "http://api:3000/";
                        let headers = {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Authorization': ''
                        }
                        console.log(process.env)
                        let body = {
                            'username': process.env.XUSERNAME,
                            'password': process.env.XPASSWORD,
                            'appId': 'appID1',
                        }
                        let res_auth = await axios.post(`${API_DB_URL}/app/login/`, JSON.stringify(body), { headers });
                        
                        if (res_auth.status == 200) {
                            headers.Authorization = 'Bearer ' + res_auth.data.token;
                            
                            res_auth = await axios.get(`${API_DB_URL}/api/thaid_states?state=${state}`,{ headers });
                            if (res_auth.status == 200) {
                                let data = res_auth.data;
                                if (data && data.length > 0) {
                                    try {
                                        vurl = data[0].return_url || vurl;
                                        scope = JSON.parse(data[0].scope).data.join(" ") || scope;
                                    } catch (error) {
                                        console.log(error); 
                                        state = "webapp";
                                        scope = "pid name";                                       
                                    }
                                } else {
                                    console.log("No data found for state:", data);
                                    state = "webapp";
                                    scope = "pid name";
                                }
                            } else {
                                console.log("No data res_auth state:", res_auth);
                                state = "webapp";
                                scope = "pid name";
                            }
                        }
                        console.log(vurl);
                        console.log(thaid);
                        if (state==="webapp" && scope.trim() === ""){
                            scope = "pid name";
                        }
                        
                        console.log("scope",scope);
                        let html = '<html><body>';
                        html += `   <form id="iform" method="POST" action="${vurl}">`;
                        html += `       <input name="access_token" type="hidden" value="${thaid.access_token}">`;
                        html += `       <input name="error" type="hidden" value="${JSON.stringify(error)}">`;
                        console.log(vurl);
                        console.log(thaid.access_token);
                        console.log(error);
                        
                        if (scope.includes('pid')){
                            html += `       <input name="pid" type="hidden" value="${thaid.pid}">`;
                        }
                        if (scope.includes('name')){
                            html += `       <input name="uname" type="hidden" value="${thaid.name}">`;
                            html += `       <input name="name" type="hidden" value="${thaid.name}">`;
                        }                 
                        if (scope.includes('name_en')){
                            html += `       <input name="name_en" type="hidden" value="${thaid.name_en}">`;
                        }                 
                        if (scope.includes('birthdate')){       
                            html += `       <input name="birthdate" type="hidden" value="${thaid.birthdate}">`;
                        }                        
                        if (!scope.includes('house_address') && scope.includes('address')){
                            html += `       <input name="address" type="hidden" value="${thaid.address.formatted}">`;
                            try {                                
                                html += `       <input name="address_raw" type="hidden" value="${thaid.address.raw}">`;
                            } catch (error) {
                                console.log(error);                                
                            }
                        }
                        if (scope.includes('house_address')){
                            html += `       <input name="house_address" type="hidden" value="${thaid.house_address.formatted}">`;
                            try {                                
                                html += `       <input name="address_raw" type="hidden" value="${thaid.house_address.raw}">`;
                            } catch (error) {
                                console.log(error);                                
                            }
                        }            
                        if (scope.includes('given_name')){
                            html += `       <input name="given_name" type="hidden" value="${thaid.given_name}">`;
                        }                   
                        if (scope.includes('middle_name')){
                            html += `       <input name="middle_name" type="hidden" value="${thaid.middle_name}">`;
                        }                      
                        if (scope.includes('family_name')){
                            html += `       <input name="family_name" type="hidden" value="${thaid.family_name}">`;
                        }                  
                        if (scope.includes('given_name_en')){
                            html += `       <input name="given_name_en" type="hidden" value="${thaid.given_name_en}">`;
                        }                
                        if (scope.includes('middle_name_en')){
                            html += `       <input name="middle_name_en" type="hidden" value="${thaid.middle_name_en}">`;
                        }                
                        if (scope.includes('family_name_en')){
                            html += `       <input name="family_name_en" type="hidden" value="${thaid.family_name_en}">`;
                        }                          
                        if (scope.includes('gender')){
                            html += `       <input name="gender" type="hidden" value="${thaid.gender}">`;
                        }                           
                        if (scope.includes('smartcard_code')){
                            html += `       <input name="smartcard_code" type="hidden" value="${thaid.smartCardCode}">`;
                        }                     
                        if (scope.includes('title')){
                            html += `       <input name="title" type="hidden" value="${thaid.titleTh}">`;
                        }                   
                        if (scope.includes('title_en')){
                            html += `       <input name="title_en" type="hidden" value="${thaid.titleEn}">`;
                        }                 
                        if (scope.includes('ial')){
                            html += `       <input name="ial" type="hidden" value="${thaid.ial}">`;
                        }                 
                        if (scope.includes('date_of_issuance')){
                            html += `       <input name="date_of_issuance" type="hidden" value="${thaid.cardCreated}">`;
                        }               
                        if (scope.includes('date_of_expiry')){
                            html += `       <input name="date_of_expiry" type="hidden" value="${thaid.cardExpired}">`;
                        }                 
                        if (scope.includes('openid')){
                            html += `       <input name="openid" type="hidden" value="${thaid.openid}">`;
                        }
                        html += `   </form>`;
                        html += `   <script>`;
                        html += `       document.getElementById("iform").submit()`;
                        html += `   </script>`;
                        html += `</body></html>`;
                        console.log(html);
                        return res.send(html).end();
                    } catch (error) {
                        console.log(error);
                        res.send(JSON.stringify(error));
                    }
                } else if (state!=="apipro" && error_msg) {
                    try {
                        let vurl = process.env.page || "http://localhost/thaid";

                        let API_DB_URL = "" + process.env.API_DB_URL || "http://app:3000/";
                        headers = {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                        }
                        let res_auth = await fetch(`${API_DB_URL}/api/thaid_states?state=${state}`, option);
                        if (res_auth.status == 200) {
                            let rs = await res_auth.json().catch(() => []) || [];
                            let data = rs?.data || [];
                            if (data && data.length > 0) {
                                try {
                                    vurl = data[0].return_url || vurl;
                                } catch (error) {
                                    console.log(error); 
                                    state = "webapp";                                   
                                }
                            } else {
                                console.log("No data found for state:", data);
                                state = "webapp";
                            }
                        } else {
                            state = "webapp";
                        }                         
                        let html = '<html><body>';
                        html += `   <form id="iform" method="POST" action="${vurl}">`;
                        html += `       <input name="error" type="hidden" value="${JSON.stringify(error_msg)}">`;                    
                        html += `   </form>`;
                        html += `   <script>`;
                        html += `       document.getElementById("iform").submit()`;
                        html += `   </script>`;
                        html += `</body></html>`;
                        return res.send(html).end();
                    } catch (error) {
                        console.log(error);
                        res.send(JSON.stringify(error));
                    }
                } else {
                    return res.json({
                        state: state,
                        thaid: thaid,
                        error: error_msg
                    });
                } 
            } else if (code && error_msg ) {
                try {
                    let vurl = process.env.page || "http://localhost/thaid";

                    let API_DB_URL = "" + process.env.API_DB_URL || "http://api:3000/";
                    let headers = {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': ''
                    }
                    console.log(process.env)
                    let body = {
                        'username': process.env.XUSERNAME,
                        'password': process.env.XPASSWORD,
                        'appId': 'appID1',
                    }
                    let res_auth = await axios.post(`${API_DB_URL}/app/login/`, JSON.stringify(body), { headers });
                    
                    if (res_auth.status == 200) {
                        headers.Authorization = 'Bearer ' + res_auth.data.token;
                        
                        res_auth = await axios.get(`${API_DB_URL}/api/thaid_states?state=${state}`,{ headers });
                        if (res_auth.status == 200) {
                            let data = res_auth.data;
                            if (data && data.length > 0) {
                                try {
                                    vurl = data[0].return_url || vurl;
                                } catch (error) {
                                    console.log(error); 
                                    state = "webapp";                                   
                                }
                            } else {
                                console.log("No data found for state:", data);
                                state = "webapp";
                            }
                        } else {
                            state = "webapp";
                        }
                    }
                    console.log(vurl);
                    
                    let html = '<html><body>';
                    html += `   <form id="iform" method="POST" action="${vurl}">`;
                    html += `       <input name="error" type="hidden" value="${JSON.stringify(error_msg)}">`;                    
                    html += `   </form>`;
                    html += `   <script>`;
                    html += `       document.getElementById("iform").submit()`;
                    html += `   </script>`;
                    html += `</body></html>`;
                    return res.send(html).end();
                } catch (error) {
                    console.log(error);
                    res.send(JSON.stringify(error));
                }
            } else if (error_msg ) {
                try {
                    let vurl = process.env.page || "http://localhost/thaid";

                    let API_DB_URL = "" + process.env.API_DB_URL || "http://api:3000/";
                    let headers = {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Authorization': ''
                    }
                    console.log(process.env)
                    let body = {
                        'username': process.env.XUSERNAME,
                        'password': process.env.XPASSWORD,
                        'appId': 'appID1',
                    }
                    let res_auth = await axios.post(`${API_DB_URL}/app/login/`, JSON.stringify(body), { headers });
                    
                    if (res_auth.status == 200) {
                        headers.Authorization = 'Bearer ' + res_auth.data.token;
                        
                        res_auth = await axios.get(`${API_DB_URL}/api/thaid_states?state=${state}`,{ headers });
                        if (res_auth.status == 200) {
                            let data = res_auth.data;
                            if (data && data.length > 0) {
                                try {
                                    vurl = data[0].return_url || vurl;
                                } catch (error) {
                                    console.log(error); 
                                    state = "webapp";                                   
                                }
                            } else {
                                console.log("No data found for state:", data);
                                state = "webapp";
                            }
                        } else {
                            state = "webapp";
                        }
                    }
                    console.log(vurl);
                    
                    let html = '<html><body>';
                    html += `   <form id="iform" method="POST" action="${vurl}">`;
                    html += `       <input name="error" type="hidden" value="${JSON.stringify(error_msg)}">`;                    
                    html += `   </form>`;
                    html += `   <script>`;
                    html += `       document.getElementById("iform").submit()`;
                    html += `   </script>`;
                    html += `</body></html>`;
                    return res.send(html).end();
                } catch (error) {
                    console.log(error);
                    res.send(JSON.stringify(error));
                }
            } else {
                return res.json({ 
                    state: state,
                    thaid: thaid,
                    error: error_msg 
                });
            }
        } catch (error) {
            console.log(error)
            return res.json({ 
                state: state,
                thaid: thaid,
                error: error });
        }
    }
}
