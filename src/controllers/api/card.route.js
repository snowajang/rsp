import { Router } from 'express';
import https from 'https';
import { XMLParser } from 'fast-xml-parser';

const router = Router();
const xmlParser = new XMLParser({ ignoreAttributes: false });

router.post("/api/death", async (req, res, next) => {
    try {
        const targetId = req.body.targetId;
        const dob = req.body.dob;
        if (!targetId || !dob) {            
            return res.status(400).send({ error: "Missing targetId or dob" });
        }
        const soapArgs = { pid: targetId, dob: dob };

        const soapXML = `<?xml version="1.0" encoding="utf-8"?>
            <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
                <soap12:Body>
                    <CheckDeathStatus xmlns="http://tempuri.org/">
                    <pid>${soapArgs.pid}</pid>
                    <dob>${soapArgs.dob}</dob>
                    </CheckDeathStatus>
                </soap12:Body>
            </soap12:Envelope>`.trim();
            
        console.log("soapXML",soapXML)
        const agent = new https.Agent({ rejectUnauthorized: false });
        const response = await fetch('https://idcard.bora.dopa.go.th/checkstatus/popstatusservice.asmx', {
            method: 'POST',
            body: soapXML,
            headers: {
                'Content-Type': 'application/soap+xml; charset=utf8'
            },
            agent,
            signal: AbortSignal.timeout(2000000)
        });
        
        const xml = await response.text();
        const parser = new XMLParser({ ignoreAttributes: false });
        const json = parser.parse(xml);
        if (!json || !json['soap:Envelope'] || !json['soap:Envelope']['soap:Body']) {
            console.log(xml)
            return res.status(500).send({ errorNumber: 500, errorMessage: "Internal SOAP Response", data: null });
        } else {
            let data_json = json?.['soap:Envelope']?.['soap:Body']?.['CheckDeathStatusResponse']?.['CheckDeathStatusResult'];
            let data = {};
            data.stCode = data_json?.dataInfo?.stCode;
            data.stDesc = data_json?.dataInfo?.stDesc || "";
            data.isError = data_json?.isError || false;
            data.isErrorMessage = data_json?.errorDesc || "";
            return res.status(200).send({ errorNumber: 0, errorMessage: null, data: data });
        }
    } catch (error) {
        console.error("Error processing request:", error);
        return res.status(200).send({ errorNumber: 9999, errorMessage: "พบปัญหาการเชื่อมต่อ กรุณาติดต่อผู้ดูและระบบ", data: data });
    }
});

// URL ของ SOAP service สำหรับตรวจ laser
// แนะนำให้เอาไปไว้ใน .env เช่น CHECKLASER_URL=...
const CHECKLASER_URL =
  process.env.CHECKLASER_URL ||
  'https://idcard.bora.dopa.go.th/checkcardstatus/checkcardservice.asmx';

// helper สำหรับเรียก SOAP
async function callLaserSoap({ pid, fname, lname, dob, laser, timeoutMs = 20000 }) {
    const agent = new https.Agent({ rejectUnauthorized: false });

    const soapXML = `<?xml version="1.0" encoding="utf-8"?>
        <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                        xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                        xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
        <soap12:Body>
            <CheckCardByLaser xmlns="http://tempuri.org/">
            <PID>${pid}</PID>
            <FirstName>${fname}</FirstName>
            <LastName>${lname}</LastName>
            <BirthDay>${dob}</BirthDay>
            <Laser>${laser}</Laser>
            </CheckCardByLaser>
        </soap12:Body>
        </soap12:Envelope>`.trim();

    const response = await fetch(CHECKLASER_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/soap+xml; charset=utf-8',
            'Connection': 'close'
        },
        body: soapXML,
        agent,
        signal: AbortSignal.timeout(timeoutMs)
    });

    let xml = await response.text();
    // โค้ดเดิมใช้ response.data.replaceAll("soap:","")
    xml = xml.replace(/soap:/g, '');

    const json = xmlParser.parse(xml);
    return { response, xml, json };
}

router.post('/api/checklaser', async (req, res, next) => {
    try {
        const { pid, fname, lname, dob, laser } = req.body || {};

        // เช็คตามเงื่อนไขเดิม: ต้องมีครบทั้ง 5 ตัว
        if (!pid || !fname || !lname || !dob || !laser) {
        return res
            .status(400)
            .json({ error: 'กรุณาใส่ค่า pid, fname, lname, dob, laser ให้ครบ' });
        }

        const { response, xml, json } = await callLaserSoap({
            pid: String(pid),
            fname,
            lname,
            dob: String(dob),
            laser
        });

        let result = {};
        try {
        // โค้ดเดิมไล่ children จาก txml:
        // Envelope -> Body -> CheckCardByLaserResponse -> CheckCardByLaserResult -> children (IsError, ErrorMessage, Code, Desc)
        const soapBody =
            json?.Envelope?.Body?.CheckCardByLaserResponse?.CheckCardByLaserResult;

        if (soapBody) {
            const isErrorRaw = soapBody?.IsError;
            const isError =
            typeof isErrorRaw === 'string'
                ? isErrorRaw.toLowerCase() === 'true'
                : !!isErrorRaw;

            result = {
                isError: isError ?? false,
                isErrorDesc: soapBody?.ErrorMessage ?? '',
                code: soapBody?.Code ? parseInt(soapBody.Code, 10) : 0,
                desc: soapBody?.Desc ?? ''
            };
        } else {
            // ถ้า structure ไม่ตรง ให้ส่ง raw กลับไปช่วย debug
            result = {
                isError: true,
                isErrorDesc: 'Invalid SOAP structure',
                code: -1,
                desc: '',
                //raw: json
            };
        }
        } catch (parseErr) {
            console.error('Parse error in /api/checklaser:', parseErr);
            result = {
                isError: true,
                isErrorDesc: 'Error parsing SOAP response',
                code: -1,
                desc: '',
                //raw: xml
            };
        }

        return res.status(response.ok ? 200 : 500).json(result);
    } catch (error) {
        console.error('Error in /api/checklaser:', error);       
        return res.status(200).send({ errorNumber: 9999, errorMessage: "พบปัญหาการเชื่อมต่อ กรุณาติดต่อผู้ดูและระบบ", data: data });
    }
});

const CHECKCARD_URL =
  process.env.CHECKCARD_URL ||
  'https://idcard.bora.dopa.go.th/checkcardstatus/checkcardservice.asmx';

async function callChipSoap({ pid, chipno, bp1no, timeoutMs = 20000 }) {
  const agent = new https.Agent({ rejectUnauthorized: false });

  const soapXML = `<?xml version="1.0" encoding="utf-8"?>
    <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                     xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                     xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
      <soap12:Body>
        <CheckCardByCID xmlns="http://tempuri.org/">
          <ChipNo>${chipno}</ChipNo>
          <pid>${pid}</pid>
          <bp1no>${bp1no}</bp1no>
        </CheckCardByCID>
      </soap12:Body>
    </soap12:Envelope>`.trim();

  const response = await fetch(CHECKCARD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/soap+xml; charset=utf-8',
      'Connection': 'close'
    },
    body: soapXML,
    agent,
    signal: AbortSignal.timeout(timeoutMs)
  });

  let xml = await response.text();
  // ของเดิมมี replaceAll("soap:","") ด้วย txml :contentReference[oaicite:2]{index=2}
  xml = xml.replace(/soap:/g, '');

  const json = xmlParser.parse(xml);
  return { response, xml, json };
}

router.post('/api/checkchip', async (req, res) => {
    try {
        const { pid, chipno, bp1no } = req.body || {};

        // NOTE: ของเดิมใช้ if (!pid && !chipno && !bp1no) ซึ่งจะ error เฉพาะกรณี "หายทั้งหมด"
        // ผมปรับเป็น OR เพื่อให้ "ต้องมีครบทุกตัว"
        if (!pid || !chipno || !bp1no) {
        return res
            .status(400)
            .json({ error: 'กรุณาใส่ค่า pid, chipno, bp1no ให้ครบ' });
        }

        const { response, xml, json } = await callChipSoap({
            pid: String(pid),
            chipno,
            bp1no
        });

        let result = {};
        try {
        // จากโค้ดเดิม: Envelope -> Body -> CheckCardByCIDResponse -> CheckCardByCIDResult -> children
        // แล้วหา IsError, ErrorMessage, Code, Desc ด้วย loop :contentReference[oaicite:3]{index=3}
        const soapResult =
            json?.Envelope?.Body?.CheckCardByCIDResponse?.CheckCardByCIDResult;

        if (soapResult) {
            const isErrorRaw = soapResult?.IsError;
            const isError =
            typeof isErrorRaw === 'string'
                ? isErrorRaw.toLowerCase() === 'true'
                : !!isErrorRaw;

            result = {
                isError: isError ?? false,
                isErrorDesc: soapResult?.ErrorMessage ?? '',
                code: soapResult?.Code != null ? parseInt(soapResult.Code, 10) : 0,
                desc: soapResult?.Desc ?? ''
            };
        } else {
            result = {
                isError: true,
                isErrorDesc: 'Invalid SOAP structure',
                code: -1,
                desc: '',
                //raw: json
            };
        }

        // เติมค่า default ให้เหมือน behavior เดิม
        if (result.isError === undefined) result.isError = false;
        if (result.isErrorDesc === undefined) result.isErrorDesc = '';
        if (result.code === undefined) result.code = 0;
        if (result.desc === undefined) result.desc = '';
        } catch (parseErr) {
        console.error('Parse error in /api/checkchip:', parseErr);
        result = {
            isError: true,
            isErrorDesc: 'Error parsing SOAP response',
            code: -1,
            desc: '',
            //raw: xml
        };
        }

        return res.status(response.ok ? 200 : 500).json(result);
    } catch (err) {
        console.error('Error in /api/checkchip:', err);
        return res.status(200).send({ errorNumber: 9999, errorMessage: "พบปัญหาการเชื่อมต่อ กรุณาติดต่อผู้ดูและระบบ", data: data });
    }
});


export default router;
