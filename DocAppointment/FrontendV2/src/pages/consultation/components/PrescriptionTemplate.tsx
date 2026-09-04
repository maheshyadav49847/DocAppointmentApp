import { forwardRef } from 'react';

export interface PrescriptionTemplateProps {
  patient: any;
  visit: any;
  doctor: any;
  branch?: any;
}

const PrescriptionTemplate = forwardRef<HTMLDivElement, PrescriptionTemplateProps>(({ patient, visit, doctor, branch }, ref) => {
  if (!patient || !visit) return null;

  let medicines = visit.medicines || [];
  if (typeof medicines === 'string') {
    try {
      medicines = JSON.parse(medicines);
    } catch {
      medicines = [];
    }
  }

  const symptoms = visit.symptoms || '';
  const diagnosis = visit.diagnosis || '';
  const advice = visit.advice || '';

  const chunks: any[] = [];
  if (medicines.length === 0) {
    chunks.push([]);
  } else {
    for (let i = 0; i < medicines.length; i += 6) {
      chunks.push(medicines.slice(i, i + 6));
    }
  }

  return (
    <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
      <div ref={ref} style={{ display: 'flex', flexDirection: 'column' }}>
        {chunks.map((medChunk, pageIndex) => (
          <div
            key={pageIndex}
            className="rx-page"
            style={{
              width: '850px',
              minHeight: '1200px',
              padding: '40px 40px',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              pageBreakAfter: 'always'
            }}
          >
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '24px' }}>
          {/* Logo & Clinic Name / Doctor details */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1, minWidth: 0 }}>
            <div style={{
              width: '76px', height: '76px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: '#ffffff', padding: '0px'
            }}>
              {branch?.logoBase64 ? (
                <img 
                  src={branch.logoBase64.replace(/\s+/g, '').startsWith('data:image') 
                    ? branch.logoBase64.replace(/\s+/g, '') 
                    : `data:image/png;base64,${branch.logoBase64.replace(/\s+/g, '')}`} 
                  alt="Clinic Logo" 
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                  crossOrigin="anonymous"
                />
              ) : (
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b' }}>+</div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
              <h1 style={{ color: '#0f172a', fontSize: '24px', fontWeight: '900', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.2 }}>
                {branch?.name || "MODERN CLINIC"}
              </h1>
              <h2 style={{ color: '#334155', fontSize: '18px', fontWeight: '700', margin: 0, lineHeight: 1.2 }}>
                Dr. {doctor?.name || visit.doctorName}
              </h2>
              <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', lineHeight: 1.4 }}>
                {doctor?.qualification} {doctor?.specialization ? `| ${doctor?.specialization}` : ''}
              </div>
              {doctor?.registrationNumber && (
                <div style={{ color: '#0ea5e9', fontSize: '13px', fontWeight: '700', marginTop: '2px', letterSpacing: '0.5px' }}>
                  Reg. No: {doctor?.registrationNumber}
                </div>
              )}
            </div>
          </div>

          {/* Right Side Address & Contact */}
          <div style={{ textAlign: 'right', fontSize: '13px', color: '#64748b', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end', width: '280px', flexShrink: 0 }}>
            <span style={{ fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>Address & Contact</span>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: '#0f172a', fontWeight: '600' }}>
              <span style={{ whiteSpace: 'pre-wrap', textAlign: 'right', lineHeight: '1.4' }}>{branch?.address || "123 Medical Center, Health Avenue"}</span>
            </div>
            {(branch?.phone || branch?.whatsAppNumber) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', color: '#0f172a' }}>
                <span style={{ fontWeight: '700', fontSize: '14px', letterSpacing: '0.5px' }}>{branch?.phone || branch?.whatsAppNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Divider Line */}
        <div style={{ display: 'flex', height: '2px', marginBottom: '24px', backgroundColor: '#e2e8f0' }}></div>

        {/* Patient Details */}
        <div style={{
          padding: '0 0 20px 0',
          marginBottom: '24px',
          borderBottom: '2px dashed #e2e8f0',
          position: 'relative',
          zIndex: 10,
          fontSize: '14px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px 24px' }}>
            <div style={{ display: 'flex' }}>
              <span style={{ width: '100px', color: '#64748b', fontWeight: '600' }}>Patient ID:</span>
              <span style={{ fontWeight: '700', color: '#0f172a' }}>{patient?.patientCode}</span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ width: '100px', color: '#64748b', fontWeight: '600' }}>Date & Time:</span>
              <span style={{ fontWeight: '600', color: '#0f172a' }}>{new Date(visit.visitDate || new Date()).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ width: '100px', color: '#64748b', fontWeight: '600' }}>Patient Name:</span>
              <span style={{ fontWeight: '700', color: '#0f172a' }}>{patient?.name} <span style={{ color: '#475569', fontWeight: '500' }}>({patient?.age ? `${patient.age}y` : ''} {patient?.gender ? `, ${patient.gender}` : ''})</span></span>
            </div>
            <div style={{ display: 'flex' }}>
              <span style={{ width: '100px', color: '#64748b', fontWeight: '600' }}>Contact:</span>
              <span style={{ fontWeight: '600', color: '#0f172a' }}>{patient?.phone || 'N/A'}</span>
            </div>
          </div>
          {patient?.address && (
            <div style={{ display: 'flex', marginTop: '12px' }}>
              <span style={{ width: '100px', color: '#64748b', fontWeight: '600' }}>Address:</span>
              <span style={{ fontWeight: '600', color: '#334155' }}>{patient?.address}</span>
            </div>
          )}
        </div>

        {/* Vitals */}
        {(visit.bloodPressure || visit.heartRate || visit.temperature || visit.weight || visit.oxygenLevel || visit.bloodSugar || visit.respiratoryRate) && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ color: '#94a3b8', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Clinical Vitals</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
              {visit.bloodPressure && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>BP:</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{visit.bloodPressure} <span style={{ fontSize: '11px', fontWeight: '500', color: '#64748b' }}>mmHg</span></span>
                </div>
              )}
              {visit.heartRate && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Pulse:</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{visit.heartRate} <span style={{ fontSize: '11px', fontWeight: '500', color: '#64748b' }}>bpm</span></span>
                </div>
              )}
              {visit.temperature && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Temp:</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{visit.temperature} <span style={{ fontSize: '11px', fontWeight: '500', color: '#64748b' }}>°F</span></span>
                </div>
              )}
              {visit.weight && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Weight:</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{visit.weight} <span style={{ fontSize: '11px', fontWeight: '500', color: '#64748b' }}>kg</span></span>
                </div>
              )}
              {visit.oxygenLevel && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>SpO2:</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{visit.oxygenLevel} <span style={{ fontSize: '11px', fontWeight: '500', color: '#64748b' }}>%</span></span>
                </div>
              )}
              {visit.bloodSugar && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Sugar:</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{visit.bloodSugar}</span>
                </div>
              )}
              {visit.respiratoryRate && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Resp:</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>{visit.respiratoryRate} <span style={{ fontSize: '11px', fontWeight: '500', color: '#64748b' }}>/min</span></span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Diagnosis & Symptoms Grid */}
        {(diagnosis || symptoms) && (
          <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', gap: '24px' }}>
            {diagnosis && (
              <div style={{ flex: 1 }}>
                <div style={{ color: '#94a3b8', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Diagnosis</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>
                  {diagnosis.toUpperCase()}
                </div>
              </div>
            )}
            {symptoms && (
              <div style={{ flex: 1, textAlign: diagnosis ? 'right' : 'left' }}>
                <div style={{ color: '#94a3b8', fontWeight: '700', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Symptoms / Chief Complaints</div>
                <div style={{ fontSize: '14px', color: '#334155', fontWeight: '500', lineHeight: '1.5' }}>
                  {symptoms}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rx Symbol */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '20px', paddingBottom: '8px' }}>
          <div style={{ fontSize: '42px', fontFamily: 'serif', fontWeight: '400', color: '#0f172a', fontStyle: 'italic', lineHeight: 1 }}>
            Rx
          </div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', paddingBottom: '6px' }}>
            Prescribed Medicines
          </div>
        </div>

        {/* Medicines Table */}
        {medChunk.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 0', textAlign: 'left', width: '5%', color: '#64748b', fontWeight: '700', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>#</th>
                  <th style={{ padding: '8px 0', textAlign: 'left', width: '30%', color: '#64748b', fontWeight: '700', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>Medicine Name</th>
                  <th style={{ padding: '8px 0', textAlign: 'left', width: '15%', color: '#64748b', fontWeight: '700', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>Dosage</th>
                  <th style={{ padding: '8px 0', textAlign: 'left', width: '20%', color: '#64748b', fontWeight: '700', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>Timing & Freq</th>
                  <th style={{ padding: '8px 0', textAlign: 'left', width: '10%', color: '#64748b', fontWeight: '700', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>Duration</th>
                  <th style={{ padding: '8px 0', textAlign: 'left', width: '20%', color: '#64748b', fontWeight: '700', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>Instructions</th>
                </tr>
              </thead>
              <tbody>
                {medChunk.map((m: any, i: number) => (
                  <tr key={i}>
                    <td style={{ padding: '16px 0', verticalAlign: 'top', fontWeight: '600', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                      {i + 1}.
                    </td>
                    <td style={{ padding: '16px 0', verticalAlign: 'top', borderBottom: '1px solid #f1f5f9', paddingRight: '12px' }}>
                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>
                        {m.medicineName.toUpperCase()}
                      </div>
                      {m.medicineType && (
                        <div style={{ color: '#64748b', fontSize: '11px', marginTop: '4px', fontStyle: 'italic', fontWeight: '600' }}>{m.medicineType}</div>
                      )}
                    </td>
                    <td style={{ padding: '16px 0', textAlign: 'left', verticalAlign: 'top', borderBottom: '1px solid #f1f5f9', paddingRight: '12px' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>
                        {m.doseQty || m.dosage}
                      </div>
                    </td>
                    <td style={{ padding: '16px 0', textAlign: 'left', verticalAlign: 'top', borderBottom: '1px solid #f1f5f9', paddingRight: '12px' }}>
                      <div style={{ fontWeight: '600', color: '#0f172a' }}>{m.doseSchedule}</div>
                      {m.foodTiming && (
                        <div style={{ color: '#475569', fontSize: '12px', marginTop: '4px', fontWeight: '500' }}>
                          {m.foodTiming}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px 0', textAlign: 'left', verticalAlign: 'top', borderBottom: '1px solid #f1f5f9', paddingRight: '12px' }}>
                      {m.courseDuration && (
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{m.courseDuration}</div>
                      )}
                    </td>
                    <td style={{ padding: '16px 0', verticalAlign: 'top', borderBottom: '1px solid #f1f5f9' }}>
                      {m.clinicalInstructions ? (
                        <div style={{ color: '#475569', fontSize: '12px', lineHeight: '1.4', fontStyle: 'italic', fontWeight: '500' }}>{m.clinicalInstructions}</div>
                      ) : (
                        <div style={{ color: '#cbd5e1', fontSize: '12px' }}>-</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Advice & Follow Up Grid */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '32px', marginTop: 'auto', paddingTop: '20px' }}>
          {/* Advice */}
          {advice && (
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '700', color: '#94a3b8', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>General Advice / Plan</div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '14px', color: '#334155', fontWeight: '500' }}>{advice}</div>
            </div>
          )}

          {/* Follow-up */}
          {visit.followUpDate && (
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: advice ? 'right' : 'left', alignItems: advice ? 'flex-end' : 'flex-start' }}>
              <span style={{ fontWeight: '700', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Next Follow-up</span>
              <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '16px' }}>
                {new Date(visit.followUpDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'long' })}
              </span>
              {visit.followUpInstructions && (
                <div style={{ marginTop: '8px', color: '#475569', fontSize: '13px', fontWeight: '500' }}>
                  Note: {visit.followUpInstructions}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Signature */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '60px', marginTop: '20px' }}>
          <div style={{ textAlign: 'center', width: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '100%', borderTop: '1px solid #0f172a', paddingTop: '12px', marginBottom: '8px' }}></div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Dr. {doctor?.name || visit.doctorName}</div>
            {doctor?.qualification && <div style={{ fontSize: '13px', color: '#475569', marginTop: '2px', fontWeight: '600' }}>{doctor.qualification}</div>}
            {doctor?.registrationNumber && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', fontWeight: '500' }}>Regd: {doctor.registrationNumber}</div>}
          </div>
        </div>

        {/* Page Footer Text */}
        <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid #e2e8f0', paddingTop: '16px', fontWeight: '500' }}>
          This is a digitally generated prescription. Not valid for medico-legal purposes without signature. | Page {pageIndex + 1} of {chunks.length}
        </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default PrescriptionTemplate;
