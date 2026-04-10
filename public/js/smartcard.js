var server_log = "http://localhost:8989"
var smclinkread = `${server_log}/smartcard`
var smclinkreadimage = `${server_log}/smartcard/umbstring/image`
var smclinkreadcid = `${server_log}/checkcard/umbstring/cid`
var smclinkreadlaser = `${server_log}/checkcard/umbstring/laser`

async function smcreaderlist(){
	fetch(smclinkread)
	.then(data => data.json())
	.then(data => {
		var runsmc = document.getElementById("runsmc");
		runsmc.innerHTML = '';
		
		var currentDiv = document.createElement("div");
		currentDiv.id = "errordiv"
		currentDiv.classList.add("text-danger");
		currentDiv.classList.add("text-center");
		runsmc.appendChild(currentDiv);
		
		if (data.code != 0) {			
			currentDiv.innerHTML = data.desc;
		} else {
			var currentDiv = document.createElement("div");
			currentDiv.classList.add("text-center");
			currentDiv.classList.add("col-8");
			currentDiv.classList.add("mx-auto");
			currentDiv.id = "tagsmc";

			var selectList = document.createElement("select");
			selectList.id = "sellk";
			selectList.classList.add("form-select");
			selectList.classList.add("mb-2");
			var i = -1;
			for (i = 0; i < data.reader.length; i++) {
				var option = document.createElement("option");
				option.value = i;
				option.text = data.reader[i];
				selectList.appendChild(option);
			}
			currentDiv.appendChild(selectList);
			var objP = document.createElement("p");
			objP.classList.add("d-inline");
			objP.innerHTML = " ";
			currentDiv.appendChild(objP);

			var buttons = document.createElement("button");
			buttons.id = 'smconchild';
			buttons.classList.add("d-inline");
			buttons.classList.add("btn");
			buttons.classList.add("btn-info");
			buttons.classList.add("pb-2");
			buttons.type = 'button';
			buttons.onclick = smcopencard;
			buttons.innerHTML = 'อ่านข้อมูลจากบัตร';
			currentDiv.appendChild(buttons);
			runsmc.appendChild(currentDiv);
		}
	})
	.catch(error => {
		console.log(error);
		document.getElementById('errordiv').innerHTML = "เนื่องจาก มีปัญหาในการติดต่อสื่อสาร กรุณาตรวจสอบ Agent";
		document.getElementById('errordiv').classList.add("text-danger");
	})
}

function smcopencard(){
    document.getElementById('errordiv').innerHTML = "";
	
	document.getElementById("pid").innerHTML = "";
	document.getElementById("xnameTh").innerHTML = "";
	document.getElementById("xnameEn").innerHTML = "";
	document.getElementById("xaddress").innerHTML = "";
	document.getElementById("xbirthDate").innerHTML = "";
	document.getElementById("xissueDate").innerHTML = "";
	document.getElementById("xexpiryDate").innerHTML = "";
	document.getElementById("cid").innerHTML = "";
	document.getElementById("bp1").innerHTML = "";
	document.getElementById("laser").innerHTML = "";
	document.getElementById("vimg").setAttribute('src', `images/avatar-999.svg`)
	document.getElementById("cerpop").innerHTML = "";
	
	let smc_index = parseInt(document.getElementById("sellk").value); 

	var div_step_1 = document.createElement("p")
	div_step_1.innerHTML = 'อ่านข้อมูลจากบัตร'
	document.getElementById("showimagenx").appendChild(div_step_1)
	fetch(`${smclinkread}/${smc_index}`)
	.then(response => response.json())
	.then(data => {
		if (data.code != 0){
			div_step_1.innerHTML = 'อ่านข้อมูลจากบัตร....ไม่สำเร็จ'
			document.getElementById('errordiv').innerHTML = data.desc;
			document.getElementById('errordiv').classList.add("text-danger");
		}else {
			div_step_1.innerHTML = 'อ่านข้อมูลจากบัตร....สำเร็จ'
			pop = {}
			pop = data.pop
			if (pop.Image64) {
                pop.image64 = pop.Image64
            }
			var div_step_2 = document.createElement("p")
			div_step_2.innerHTML = 'อ่านข้อมูลหมายเลขซิป'
			document.getElementById("showimagenx").appendChild(div_step_2)
			fetch(smclinkreadcid.replace(/umbstring/g, smc_index))
			.then(response => response.json())
			.then(data => {
				if (data.code != 0) {					
					div_step_2.innerHTML = 'อ่านข้อมูลหมายเลขซิป....ไม่สำเร็จ'
				} else {				
					div_step_2.innerHTML = 'อ่านข้อมูลหมายเลขซิป....สำเร็จ'
				}
				pop.cid = data.cid
				pop.bp1 = data.bp1
				var div_step_3 = document.createElement("p")
				div_step_3.innerHTML = 'อ่านข้อมูลเลขกำกับบัตร'
				document.getElementById("showimagenx").appendChild(div_step_3)
				
				fetch(smclinkreadlaser.replace(/umbstring/g, smc_index))
				.then(response => response.json())
				.then(data => {
					if (data.code!=0){						
						div_step_3.innerHTML = 'อ่านข้อมูลเลขกำกับบัตร....ไม่สำเร็จ'
					}else {
						div_step_3.innerHTML = 'อ่านข้อมูลเลขกำกับบัตร....สำเร็จ'
					}
					pop.laser = data.laser						
					
					fetch(smclinkreadimage.replace(/umbstring/g, smc_index))
					.then(response => response.json())
					.then(data => {		
						//console.log(data)
						pop.cerpop = { image: data.images }			
						var div_step_4 = document.createElement("p")
						div_step_4.innerHTML = 'กำลังประมวลผล'
						document.getElementById("showimagenx").appendChild(div_step_4)

						//console.log(emppid)
						// var postoption = {
						// 	method: 'POST',
						// 	headers: {
						// 		'Accept': 'application/json',
						// 		'Content-Type': 'application/json'
						// 	},
						// 	body: JSON.stringify({
						// 		pid: emppid,
						// 		user_pid: parseFloat(pop.pid),
						// 		desc: `อ่านข้อมูลบัตร ปชช ของ ${pop.pid} ${pop.title}${pop.fname} ${pop.mname} ${pop.lname} โดย [${emppid}] ${empname}`,
						// 		status: 2
						// 	})
						// }

						// fetch(server_log, postoption)
						// .then(response => response.json())
						// .then(data => {
						// 	console.log(data);							
						// })
						// .catch(error => {
						// 	console.log(error);
						// 	document.getElementById('errordiv').innerHTML = "เนื่องจาก มีปัญหาในการติดต่อสื่อสาร LK Logs";
						// 	document.getElementById('errordiv').classList.add("text-danger");
						// });	

						document.getElementById("pid").innerHTML = pop.pid
						document.getElementById("xpid").value = pop.pid
						// document.getElementById("uname").innerHTML = `${pop.title}${pop.fname} ${pop.mname} ${pop.lname}`
						document.getElementById("nameTh").innerHTML = `${pop.title}${pop.fname} ${pop.mname} ${pop.lname}`
						document.getElementById("xnameTh").innerHTML = `${pop.title}${pop.fname} ${pop.mname} ${pop.lname}`
						document.getElementById("nameEn").innerHTML = `${pop.etitle}${pop.efname} ${pop.emname} ${pop.elname}`
						document.getElementById("xnameEn").innerHTML = `${pop.etitle}${pop.efname} ${pop.emname} ${pop.elname}`
						// document.getElementById("xuname").value = `${pop.title}${pop.fname} ${pop.mname} ${pop.lname}`
						document.getElementById("birthDate").innerHTML = pop.dob
						document.getElementById("xbirthDate").innerHTML = pop.dob
						// document.getElementById("ndob").value = pop.idob
						document.getElementById("xdob").value = pop.idob
						document.getElementById("address").innerHTML = pop.address
						document.getElementById("xaddress").value = pop.address
						// document.getElementById("issue_date").innerHTML = pop.dIssue
						document.getElementById("issueDate").innerHTML = pop.dIssue
						document.getElementById("xissueDate").value = pop.dIssue
						// document.getElementById("expire_date").innerHTML = pop.dExpiry
						document.getElementById("expiryDate").innerHTML = pop.dExpiry
						document.getElementById("xexpiryDate").value = pop.dExpiry
						document.getElementById("bp1").innerHTML = pop.bp1
						// document.getElementById("xbp1").value = pop.bp1
						document.getElementById("cid").innerHTML = pop.cid
						// document.getElementById("xcid").value = pop.cid
						document.getElementById("laser").innerHTML = pop.laser	
						// document.getElementById("xlaser").value = pop.laser	
						div_step_4.innerHTML = 'กำลังประมวลผล....สำเร็จ'
						document.getElementById("ximg").value = `data:image/png;base64,${pop.image64.trim()}`
						document.getElementById("vimg").setAttribute('src', `data:image/png;base64,${pop.image64.trim()}`)
						
						var br1 = document.createElement('br');
						document.getElementById("cerpop").appendChild(br1);
						var buttons = document.createElement("button");
						buttons.classList.add("btn");
						buttons.classList.add("btn-success");
						buttons.type = 'button';
						//buttons.onclick = showprintsmc;
						buttons.innerHTML = 'พิมพ์แบบรับรองสำเนา';
						document.getElementById("cerpop").appendChild(buttons);

						var br2 = document.createElement('br');
						document.getElementById("cerpop").appendChild(br2);
						var br3 = document.createElement('br');
						document.getElementById("cerpop").appendChild(br3);
						var buttonsubmit = document.createElement("button");
						buttonsubmit.classList.add("btn");
						buttonsubmit.classList.add("btn-primary");
						buttonsubmit.type = 'submit';
						buttonsubmit.innerHTML = 'ตรวจสอบบัตร';
						document.getElementById("cerpop").appendChild(buttonsubmit);
						
						delete pop.image;
						delete pop.image64;
						delete pop.r_addr;

						document.getElementById("pop").value = JSON.stringify(pop);
					})
					.catch(error => {
						console.log(error);
						document.getElementById('errordiv').innerHTML = "เนื่องจาก มีปัญหาในการติดต่อสื่อสาร กรุณาตรวจสอบ Agent";
						document.getElementById('errordiv').classList.add("text-danger");
					});						
				})
				.catch(error => {
					console.log(error);
					document.getElementById('errordiv').innerHTML = "เนื่องจาก มีปัญหาในการติดต่อสื่อสาร กรุณาตรวจสอบ Agent";
					document.getElementById('errordiv').classList.add("text-danger");
				});
				
			})
			.catch(error => {
				console.log(error);
				document.getElementById('errordiv').innerHTML = "เนื่องจาก มีปัญหาในการติดต่อสื่อสาร กรุณาตรวจสอบ Agent";
				document.getElementById('errordiv').classList.add("text-danger");
			}); 
		}
	})
	.catch(error => {
		console.log(error);
		document.getElementById('errordiv').innerHTML = "เนื่องจาก มีปัญหาในการติดต่อสื่อสาร กรุณาตรวจสอบ Agent";
		document.getElementById('errordiv').classList.add("text-danger");
	});   
}

async function smclinkage(){
	try {
		document.getElementById('errordiv').innerHTML = "";
		document.getElementById('errordiv').classList.remove("text-danger");	
		//await smcreaderlist();
		var smc_index = 0; //parseInt(document.getElementById("sellk").value);
		var smclk2read = `${server_log}/api/linkage2/info`;
		let rs = await fetch(smclk2read, {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				index: smc_index
			})
		});
		if (!rs.ok) {
			console.log(await rs.text());
			document.getElementById('errordiv').innerHTML = "เนื่องจาก มีปัญหาในการติดต่อสื่อสาร กรุณาตรวจสอบ Agent [info]";
			document.getElementById('errordiv').classList.add("text-danger");
		}
		let data = await rs.json();
		if (data.code !== 0) {
			document.getElementById('errordiv').innerHTML = `เนื่องจาก มีปัญหา [${data.code}] ${data.desc}`;
			document.getElementById('errordiv').classList.add("text-danger");
		} else { 
			let pid = data.pid;
			let cid = data.cid;
			let uname = data.uname;
			let serverlk = `/api/linkage/login/smc/`;
			let rslogin = await fetch(serverlk, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					pid: pid,
					cid: cid
				})
			});
			if (!rslogin.ok) {
				// console.log(await rslogin.text());
				try {
					let data = await rslogin.json();
					document.getElementById('errordiv').innerHTML = `เนื่องจาก มีปัญหา Linkage Center [${data.errorNumber}] ${data.errorMessage}`;
					document.getElementById('errordiv').classList.add("text-danger");
				} catch (error) {
					console.log(error);
					document.getElementById('errordiv').innerHTML = "เนื่องจาก มีปัญหาในการติดต่อ Linkage Center";
					document.getElementById('errordiv').classList.add("text-danger");
				}
			} else {
				let data = await rslogin.json();
				let random = data.data.random;
				let smclinkageenv = `${server_log}/api/linkage2/envelop`;
				let rsenvelop = await fetch(smclinkageenv, {
					method: 'POST',
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						random: random,
						index: smc_index
					})
				});
				if (!rsenvelop.ok) {
					console.log(await rs.text());
					document.getElementById('errordiv').innerHTML = "เนื่องจาก มีปัญหาในการติดต่อสื่อสาร กรุณาตรวจสอบ Agent [envelop]";
					document.getElementById('errordiv').classList.add("text-danger");
				}else {
					let data = await rsenvelop.json();
					console.log('Envelop Data:', data);
					if (data.code !== 0) {
						document.getElementById('errordiv').innerHTML = `เนื่องจาก มีปัญหา [${data.code}] ${data.desc}`;
						document.getElementById('errordiv').classList.add("text-danger");
					} else {
						let xenvelop = data.envelope;
						let linkageauth = `/api/linkage/login/smc/auth`;
						let rslkauth = await fetch(linkageauth, {
							method: 'POST',
							headers: {
								'Accept': 'application/json',
								'Content-Type': 'application/json'
							},
							body: JSON.stringify({
								xrandom: random,
								xenvelop: xenvelop
							})	
						});
						if (!rslkauth.ok) {
							try {
								let data = await rslkauth.json();
								console.log('Linkage Auth Error:', data);
								document.getElementById('errordiv').innerHTML = `เนื่องจาก มีปัญหา Linkage Center [${data.errorNumber}] ${data.errorMessage}`;
								document.getElementById('errordiv').classList.add("text-danger");
							} catch (error) {
								console.log(error);
								document.getElementById('errordiv').innerHTML = "เนื่องจาก มีปัญหาในการติดต่อ Linkage Center";
								document.getElementById('errordiv').classList.add("text-danger");
							}
						} else {
							let data = await rslkauth.json();							
							let token = data.data.token;
							let elpid = document.createElement("input");
							elpid.type = 'hidden';
							elpid.name = 'pid';
							elpid.value = pid;
							let eltoken = document.createElement("input");
							eltoken.type = 'hidden';
							eltoken.name = 'token';
							eltoken.value = token;
							let elname = document.createElement("input");
							elname.type = 'hidden';
							elname.name = 'name';
							elname.value = uname;

							let formsmc = document.getElementById('formsmc');
							formsmc.appendChild(elpid);
							formsmc.appendChild(eltoken);
							formsmc.appendChild(elname);
							formsmc.setAttribute('method', 'post');
							formsmc.setAttribute('action', '/auth/smclogin');
							formsmc.submit();
						}
					}					
				}
			}
		}

	} catch (error) {
		console.log(error);
		document.getElementById('errordiv').innerHTML = "เนื่องจาก มีปัญหาในการติดต่อสื่อสาร กรุณาตรวจสอบ Agent";
		document.getElementById('errordiv').classList.add("text-danger");
	}
}