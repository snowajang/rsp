export function genModelFirst(modelIn, executeTimeMs = null) {
    if (!modelIn || !modelIn.data || modelIn.data.length === 0) return null;
    //console.log('genModelFirst input data', modelIn, 'executeTimeMs', executeTimeMs);
    try {
        const pop = modelIn.data.find(item => item.serviceID==1)?.responseData;   
        const popTime = modelIn.data.find(item => item.serviceID==1)?.responseTimeMs;     
        const house = modelIn.data.find(item => item.serviceID==38)?.responseData;  
        const houseTime = modelIn.data.find(item => item.serviceID==38)?.responseTimeMs;    
        //console.log('genModelFirst data', pop, house);
        if (!pop) return null;
        if (!house) return null;
        console.log('pop.responseTimeMs', popTime);
        console.log('house.responseTimeMs', houseTime);
        console.log('RealtimeMs', executeTimeMs);
        const model = {
            personalId: modelIn.personalId,
            fullnameAndRank: pop.fullnameAndRank,
            age: pop.age || "-",
            dateOfBirth: genDateTh(pop.dateOfBirth),
            dateOfMoveIn: genDateTh(pop.dateOfMoveIn),
            englishFirstName: pop.englishFirstName,
            englishLastName: pop.englishLastName,
            englishMiddleName: pop.englishMiddleName,
            englishTitleDesc: pop.englishTitleDesc,
            englishName: genNameEnglish(pop.englishTitleDesc, pop.englishFirstName, pop.englishMiddleName, pop.englishLastName),
            fatherName: pop.fatherName || "-",
            fatherNationalityCode: pop.fatherNationalityCode,
            fatherNationalityDesc: pop.fatherNationalityDesc || "-",
            fatherPersonalID: pop.fatherPersonalID || "-",
            firstName: pop.firstName,
            fullnameAndRank: pop.fullnameAndRank,
            genderCode: pop.genderCode,
            genderDesc: pop.genderDesc|| "-",
            lastName: pop.lastName,
            middleName: pop.middleName,
            motherName: pop.motherName || "-",
            motherNationalityCode: pop.motherNationalityCode,
            motherNationalityDesc: pop.motherNationalityDesc|| "-",
            motherPersonalID: pop.motherPersonalID || "-",
            nationalityCode: pop.nationalityCode,
            nationalityDesc: pop.nationalityDesc || "-",
            ownerStatusDesc: pop.ownerStatusDesc || "-",
            statusOfPersonCode: pop.statusOfPersonCode,
            statusOfPersonDesc: pop.statusOfPersonDesc || "-",
            titleCode: pop.titleCode,
            titleDesc: pop.titleDesc,
            titleName: pop.titleName,
            titleSex: pop.titleSex,
            houseID: house.houseID,
            address: genHouse(house),
            houseType: house.houseType,
            houseTypeDesc: house.houseTypeDesc,
            alleyCode: house.alleyCode,
            alleyDesc: house.alleyDesc,
            alleyWayCode: house.alleyWayCode,
            alleyWayDesc: house.alleyWayDesc,
            roadCode: house.roadCode,
            roadDesc: house.roadDesc,
            districtCode: house.districtCode,
            districtDesc: house.districtDesc,
            subdistrictCode: house.subdistrictCode,
            subdistrictDesc: house.subdistrictDesc,
            provinceCode: house.provinceCode,
            provinceDesc: house.provinceDesc,
            postcode: house.postcode,
            dateOfMoveIn: house.dateOfMoveIn,
            dateOfTerminate: house.dateOfTerminate,
        }
        return model;
    } catch (e) {
        console.log('Error genModelFirst:', e);
        return null;
    }
}

export function genHouse(house) {
    if (!house) return null;
    let address = '';
    if (house.houseNo) address += `บ้านเลขที่ ${house.houseNo} `;
    if (house.villageNo) address += `หมู่ที่ ${house.villageNo} `;
    if (house.alleyWayDesc) address += `ตรอก ${house.alleyWayDesc} `;
    if (house.alleyDesc) address += `ซอย ${house.alleyDesc} `;
    if (house.roadDesc) address += `ถนน ${house.roadDesc} `;
    if (house.subdistrictDesc) address += `ตำบล ${house.subdistrictDesc} `;
    if (house.districtDesc) address += `อำเภอ ${house.districtDesc} `;
    if (house.provinceDesc) address += `จังหวัด ${house.provinceDesc} `;
    if (house.postcode) address += `รหัสไปรษณีย์ ${house.postcode}`;
    return address.trim();
}

export function genDateTh(dateStr) {
    if (!dateStr) return "-";
    if (typeof dateStr !== 'string') {
        dateStr = String(dateStr);
    }
    let year = dateStr.substring(0, 4);
    if (year === '0000') return "-";    
    const month = dateStr.substring(4, 6);
    if (month === '00') return year;
    const day = dateStr.substring(6, 8);
    if (day === '00') return `${genMonth(month)} ${year}`;
    return `${day} ${genMonth(month)} ${year}`;
}

export function genMonth(month) {
    const monthNames = {
        '01': 'ม.ค.',
        '02': 'ก.พ.',
        '03': 'มี.ค.',
        '04': 'เม.ย.',
        '05': 'พ.ค.',
        '06': 'มิ.ย.',
        '07': 'ก.ค.',
        '08': 'ส.ค.',
        '09': 'ก.ย.',
        '10': 'ต.ค.',
        '11': 'พ.ย.',
        '12': 'ธ.ค.'
    };
    return monthNames[month] || month;
}

export function genNameEnglish(title, firstName, middleName, lastName) {
    let name = '';
    if (title) name += `${title} `;
    if (firstName) name += `${firstName} `;
    if (middleName) name += `${middleName} `;
    if (lastName) name += `${lastName}`;
    return name.trim();
}