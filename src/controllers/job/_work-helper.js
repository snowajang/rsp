import * as tools from '../../middlewares/tools.js';

export async function fetchWorkModel(req, jobwork, pid) {
  const personalID = String(pid || '').trim();
  const jobcode = {
    jobID: jobwork,
    data: [
      { serviceID: 1, query: { personalID } },
      { serviceID: 38, query: { personalID } }
    ]
  };

  const rs = await fetch('http://localhost:3000/api/linkage/search', {
    method: 'POST',
    headers: {
      Connection: 'close',
      'Content-Type': 'application/json',
      token: req.session?.user?.lk || ''
    },
    body: JSON.stringify(jobcode)
  });

  let model = null;
  if (!rs.ok) {
    let errorText = 'เกิดข้อผิดพลาดในการเรียก API';
    try {
      const errorData = await rs.json();
      if (errorData?.errorNumber) {
        errorText = `เกิดข้อผิดพลาดในการเรียก LINKAGE Error ${errorData.errorNumber}: ${errorData.errorMessage}`;
      } else {
        errorText = errorData?.message || errorText;
      }
    } catch {
      try {
        const errorTextRaw = await rs.text();
        errorText = errorTextRaw || `เกิดข้อผิดพลาดในการเรียก API (status: ${rs.status})`;
      } catch {
        errorText = `เกิดข้อผิดพลาดในการเรียก API (status: ${rs.status})`;
      }
    }
    model = { error: errorText, personalID };
  } else {
    const data = await rs.json();
    model = tools.genModelFirst(data?.data || [], data?.executeTimeMs || null);
    if (model) {
      model.personalID = personalID;
    } else {
      model = { error: 'ไม่พบข้อมูลจากบริการ LINKAGE', personalID };
    }
  }

  return model;
}

export function buildPrintedAt() {
  const now = new Date();
  const date = now.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const time = now.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  return `${date} เวลา ${time} น.`;
}
