var smclinkread = "http://localhost:12345/smartcard"
var smclinkreadimage = "http://localhost:12345/smartcard/umbstring/image"
var smclinkreadcid = "http://localhost:12345/checkcard/umbstring/cid"
var smclinkreadlaser = "http://localhost:12345/checkcard/umbstring/laser"

function smcreaderlist(){
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
	document.getElementById("uname").innerHTML = "";
	document.getElementById("address").innerHTML = "";
	document.getElementById("ddob").innerHTML = "";
	document.getElementById("issue_date").innerHTML = "";
	document.getElementById("expire_date").innerHTML = "";
	document.getElementById("cid").innerHTML = "";
	document.getElementById("bp1").innerHTML = "";
	document.getElementById("laser").innerHTML = "";
	document.getElementById("vimg").setAttribute('src', `img/avatar-999.svg`)
	document.getElementById("cerpop").innerHTML = "";
	
	let smc_index = parseInt(document.getElementById("sellk").value); 

	var div_step_1 = document.createElement("p")
	div_step_1.innerHTML = 'อ่านข้อมูลจากบัตร'
	document.getElementById("cerpop").appendChild(div_step_1)
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
			document.getElementById("cerpop").appendChild(div_step_2)
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
				document.getElementById("cerpop").appendChild(div_step_3)
				
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
						document.getElementById("cerpop").appendChild(div_step_4)

						//console.log(emppid)
						var postoption = {
							method: 'POST',
							headers: {
								'Accept': 'application/json',
								'Content-Type': 'application/json'
							},
							body: JSON.stringify({
								pid: emppid,
								user_pid: parseFloat(pop.pid),
								desc: `อ่านข้อมูลบัตร ปชช ของ ${pop.pid} ${pop.title}${pop.fname} ${pop.mname} ${pop.lname} โดย [${emppid}] ${empname}`,
								status: 2
							})
						}

						fetch(server_log, postoption)
						.then(response => response.json())
						.then(data => {})
						.catch(error => {
							console.log(error);
							document.getElementById('errordiv').innerHTML = "เนื่องจาก มีปัญหาในการติดต่อสื่อสาร LK Logs";
							document.getElementById('errordiv').classList.add("text-danger");
						});	
						document.getElementById("pid").innerHTML = pop.pid
						document.getElementById("xpid").value = pop.pid
						document.getElementById("uname").innerHTML = `${pop.title}${pop.fname} ${pop.mname} ${pop.lname}`
						document.getElementById("xuname").value = `${pop.title}${pop.fname} ${pop.mname} ${pop.lname}`
						document.getElementById("ddob").innerHTML = pop.dob
						document.getElementById("ndob").value = pop.idob
						document.getElementById("xdob").value = pop.idob
						document.getElementById("address").innerHTML = pop.address
						document.getElementById("xaddress").value = pop.address
						document.getElementById("issue_date").innerHTML = pop.dIssue
						document.getElementById("xissue_date").value = pop.dIssue
						document.getElementById("expire_date").innerHTML = pop.dExpiry
						document.getElementById("xexpire_date").value = pop.dExpiry
						document.getElementById("bp1").innerHTML = pop.bp1
						document.getElementById("xbp1").value = pop.bp1
						document.getElementById("cid").innerHTML = pop.cid
						document.getElementById("xcid").value = pop.cid
						document.getElementById("laser").innerHTML = pop.laser	
						document.getElementById("xlaser").value = pop.laser	
						div_step_4.innerHTML = 'กำลังประมวลผล....สำเร็จ'
						document.getElementById("ximg").value = `data:image;base64,${pop.image64.trim()}`
						document.getElementById("vimg").setAttribute('src', `data:image;base64,${pop.image64.trim()}`)
						
						var br1 = document.createElement('br');
						document.getElementById("cerpop").appendChild(br1);
						var buttons = document.createElement("button");
						buttons.classList.add("btn");
						buttons.classList.add("btn-success");
						buttons.type = 'button';
						buttons.onclick = showprintsmc;
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