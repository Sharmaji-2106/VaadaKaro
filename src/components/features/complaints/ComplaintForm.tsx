'use client';

import { useState, useEffect } from 'react';
import styles from './ComplaintForm.module.css';
import { Check, ChevronRight, ChevronLeft, Upload, Shield, AlertCircle, Loader2, Sparkles, FileText, Search } from 'lucide-react';
import { submitComplaint } from '@/lib/actions/complaintActions';
import { analyzeComplaint } from '@/actions/complaint-analysis';
import { getCloudinarySignature, uploadFileToCloudinary } from '@/lib/actions/uploadActions';

const DEPARTMENTS = [
  'Police', 'Municipal Corporation', 'Electricity', 'Water Supply', 
  'Road & Infrastructure', 'Cyber Crime', 'Consumer Court', 
  'Women Safety', 'Other'
];

const CATEGORIES: Record<string, string[]> = {
  'Police': ['Theft', 'Assault', 'Missing Person', 'Public Nuisance', 'Traffic Violation'],
  'Municipal Corporation': ['Waste Management', 'Illegal Construction', 'Stray Animals', 'Park Maintenance'],
  'Electricity': ['Power Cut', 'Faulty Meter', 'Voltage Fluctuating', 'New Connection Issue'],
  'Water Supply': ['No Water', 'Leaking Pipe', 'Contaminated Water', 'Billing Issue'],
  'Cyber Crime': ['Online Fraud', 'Social Media Harassment', 'Identity Theft', 'Phishing'],
  'Other': ['General Inquiry', 'Miscellaneous']
};

export const ComplaintForm = ({ 
  onSuccess 
}: { 
  onSuccess: (data: { trackingId: string, department: string }) => void 
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    department: '',
    category: '',
    priority: 'MEDIUM',
    state: '',
    city: '',
    pincode: '',
    address: '',
    declaration: false,
    aiDisclaimer: false,
  });

  const [files, setFiles] = useState<File[]>([]);
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [aiAcknowledged, setAiAcknowledged] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachmentWarning, setAttachmentWarning] = useState<string | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  // Draft persistence
  useEffect(() => {
    const draft = localStorage.getItem('vdk_complaint_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('vdk_complaint_draft', JSON.stringify(formData));
  }, [formData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = selectedFiles.filter(file => {
        const isValidSize = file.size <= 10 * 1024 * 1024;
        const isValidType = ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type);
        return isValidSize && isValidType;
      });

      if (validFiles.length < selectedFiles.length) {
        setError("Some files were rejected (too large or invalid type).");
      }
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const uploadToCloudinary = async (file: File, sigData: any) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', sigData.apiKey!);
    formData.append('timestamp', sigData.timestamp.toString());
    formData.append('signature', sigData.signature);
    formData.append('folder', 'vaadakaro_complaints');

    const res = await fetch(`https://api.cloudinary.com/v1_1/${sigData.cloudName}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || "Cloudinary upload failed");
    }
    return await res.json();
  };

  const handleAIAnalyze = async () => {
    if (!formData.description || !formData.title || !formData.department || !formData.category || aiLoading) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const result = await analyzeComplaint(
        formData.title, 
        formData.description,
        formData.department,
        formData.category
      );
      setAiResult(result);
    } catch (err: any) {
      console.warn("AI Analysis failed:", err);
      const errorMessage = err.message === "Unauthorized" 
        ? "Please log in to use Quality Verification" 
        : "Quality check temporarily unavailable";
      
      setAiResult({
        feedback: errorMessage,
        reliabilityLevel: 'LOW',
        reliabilityScore: 0,
        missingDetails: []
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleNext = () => setStep(prev => Math.min(prev + 1, 4));
  const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = async (e: React.FormEvent, confirmDuplicate = false) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const uploadedAttachments = [];
      if (files.length > 0) {
        setUploading(true);
        for (const file of files) {
          try {
            // Convert to base64 for server-side upload
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
            const base64Content = await base64Promise;
            
            const uploadRes = await uploadFileToCloudinary(base64Content);
            
            if (uploadRes.url) {
              uploadedAttachments.push({
                url: uploadRes.url,
                filename: file.name,
                mimeType: file.type,
                fileSize: file.size,
              });
            } else {
              setAttachmentWarning("Attachment could not be uploaded, but your complaint was submitted successfully.");
            }
          } catch (fileErr) {
            console.error(`Failed to process ${file.name}:`, fileErr);
            setAttachmentWarning("Some attachments could not be uploaded.");
          }
        }
        setUploading(false);
      }

      const result = await submitComplaint({ 
        ...formData, 
        declaration: declarationChecked,
        aiDisclaimer: aiAcknowledged,
        attachments: uploadedAttachments,
        confirmDuplicate 
      });
      
      if (result.success) {
        localStorage.removeItem('vdk_complaint_draft');
        onSuccess({ 
          trackingId: result.trackingId!, 
          department: result.department! 
        });
      } else {
        if (result.isDuplicate) {
          setShowDuplicateWarning(true);
        }
        setError(result.error || "An unexpected error occurred.");
      }
    } catch (err: any) {
      setError(err.message || "File upload failed. Please try again.");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const currentCategories = formData.department ? CATEGORIES[formData.department] || CATEGORIES['Other'] : [];

  return (
    <div className={styles.formContainer}>
      {/* Official Progress Tracker */}
      <div className={styles.stepper}>
        {[
          { icon: <FileText size={14} />, label: 'Complaint' },
          { icon: <Search size={14} />, label: 'Location' },
          { icon: <Upload size={14} />, label: 'Evidence' },
          { icon: <Check size={14} />, label: 'Submit' }
        ].map((s, idx) => (
          <div key={idx} className={`${styles.step} ${step >= idx + 1 ? styles.active : ''}`}>
            <div className={styles.stepCircle}>
              {step > idx + 1 ? <Check size={14} /> : idx + 1}
            </div>
            <span className={styles.stepLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.formBody}>
        {step === 1 && (
          <div className={styles.stepContent}>
            <h2>I. Complaint Details</h2>
            <p className={styles.stepDesc}>Describe your grievance clearly. Provide as much detail as possible to assist the evaluating officer.</p>
            
            <div className={styles.inputGroup}>
              <label>Subject / Title of Complaint</label>
              <input 
                type="text" 
                placeholder="Example: Delay in birth certificate issuance / Illegal garbage dumping near park" 
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
              />
            </div>

            <div className={styles.grid}>
              <div className={styles.inputGroup}>
                <label>Concerned Department</label>
                <select 
                  value={formData.department}
                  onChange={(e) => updateField('department', e.target.value)}
                >
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Grievance Category</label>
                <select 
                  value={formData.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  disabled={!formData.department}
                >
                  <option value="">Select Category</option>
                  {currentCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Detailed Description</label>
              <textarea 
                rows={6} 
                placeholder="Please mention: 1. Date of incident, 2. People involved, 3. Previous attempts to resolve (if any)..."
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
              <button 
                type="button" 
                className={styles.aiAnalyzeBtn}
                onClick={handleAIAnalyze}
                disabled={!formData.description || !formData.title || !formData.department || !formData.category || aiLoading}
              >
                {aiLoading ? <Loader2 className={styles.spinner} size={14} /> : <Sparkles size={14} />}
                {aiLoading ? "Analyzing Complaint Quality..." : "RUN QUALITY VERIFICATION"}
              </button>
            </div>

            {aiResult && (
              <div className={styles.aiFeedback}>
                <div className={styles.aiFeedbackHeader}>
                  <Shield size={16} />
                  <span>OFFICIAL QUALITY AUDIT REPORT</span>
                   <div className={`${styles.scoreBadge} ${
                     aiResult.reliabilityLevel === 'HIGH' ? styles.scoreHigh : 
                     aiResult.reliabilityLevel === 'MEDIUM' ? styles.scoreMedium : styles.scoreLow
                   }`}>
                     RELIABILITY: {aiResult.reliabilityLevel || "LOW"} ({Math.round(aiResult.reliabilityScore || 0)}%)
                   </div>
                </div>
                <div className={styles.aiFeedbackBody}>
                  <p className={styles.feedbackText}>{aiResult.feedback}</p>
                  {aiResult.missingDetails?.length > 0 && (
                    <div className={styles.missingDetails}>
                      <strong>REQUIRED ACTIONS FOR PROCESSING:</strong>
                      <ul>
                        {aiResult.missingDetails.map((detail: string, i: number) => <li key={i}>{detail}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className={styles.stepContent}>
            <h2>II. Jurisdiction & Location</h2>
            <p className={styles.stepDesc}>Identify where the incident occurred. This ensures your complaint is routed to the correct local authority.</p>
            
            <div className={styles.grid}>
              <div className={styles.inputGroup}>
                <label>State / Union Territory</label>
                <input 
                   type="text" 
                   placeholder="e.g. Haryana"
                   value={formData.state}
                   onChange={(e) => updateField('state', e.target.value)}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>City / District</label>
                <input 
                   type="text" 
                   placeholder="e.g. Gurugram"
                   value={formData.city}
                   onChange={(e) => updateField('city', e.target.value)}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label>Postal Code (PIN)</label>
              <input 
                type="text" 
                placeholder="6-digit PIN number"
                value={formData.pincode}
                onChange={(e) => updateField('pincode', e.target.value)}
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Precise Address / Landmark</label>
              <textarea 
                rows={3} 
                placeholder="Mention House No, Street, Landmark to help officers locate the issue..."
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 3 && (
           <div className={styles.stepContent}>
              <h2>III. Evidence Submission</h2>
              <p className={styles.stepDesc}>Upload supporting documents to strengthen your claim. This may include photographs, video evidence, or existing correspondence.</p>
              
              <div className={styles.uploadArea}>
                <Upload size={40} className={styles.uploadIcon} />
                <p>{files.length > 0 ? `${files.length} documents attached` : 'Click to upload files or drag them here'}</p>
                <small>Supported Formats: PDF, JPG, PNG (Max size: 10MB per file)</small>
                <input 
                  type="file" 
                  multiple 
                  className={styles.fileInput} 
                  onChange={handleFileChange}
                />
              </div>

              {files.length > 0 && (
                <div className={styles.fileList}>
                  {files.map((file, i) => (
                    <div key={i} className={styles.fileItem}>
                      <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}>Remove Attachment</button>
                    </div>
                  ))}
                </div>
              )}
           </div>
        )}

        {step === 4 && (
           <div className={styles.stepContent}>
              <h2>IV. Final Review & Attestation</h2>
              <p className={styles.stepDesc}>Verify all information. Once submitted, your grievance will be entered into the official tracking system.</p>
              
              <div className={styles.reviewGrid}>
                 <div className={styles.reviewItem}>
                    <label>SUBJECT</label>
                    <p>{formData.title || 'Not specified'}</p>
                 </div>
                 <div className={styles.reviewItem}>
                    <label>AUTHORITY</label>
                    <p>{formData.department} — {formData.category}</p>
                 </div>
                 <div className={styles.reviewItem}>
                    <label>LOCATION</label>
                    <p>{formData.city}, {formData.pincode}</p>
                 </div>
                 <div className={styles.reviewItem}>
                    <label>ATTACHMENTS</label>
                    <p>{files.length} files attached</p>
                 </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#FFF7ED', border: '1px solid #FED7AA', padding: '1.5rem', borderRadius: '4px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={declarationChecked} 
                    onChange={(e) => setDeclarationChecked(e.target.checked)} 
                    style={{ marginTop: '3px', flexShrink: 0 }} 
                  />
                  <span style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                    <b>Statutory Declaration:</b> I solemnly affirm that the facts stated in this grievance are true and accurate. I am aware that knowingly providing false information is an offense under Section 182 of the IPC.
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={aiAcknowledged} 
                    onChange={(e) => setAiAcknowledged(e.target.checked)} 
                    style={{ marginTop: '3px', flexShrink: 0 }} 
                  />
                  <span style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                    I acknowledge that AI-generated guidance is for information only and does not constitute a legal relationship.
                  </span>
                </label>
              </div>
           </div>
        )}

        <div className={styles.formFooter}>
          <button 
            className={styles.backBtn} 
            onClick={handleBack}
            disabled={step === 1}
          >
            <ChevronLeft size={16} /> Previous
          </button>
          
          {step < 4 ? (
            <button type="button" className={styles.nextBtn} onClick={handleNext}>
              Save & Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button 
              type="button" 
              className={styles.submitBtn} 
              disabled={!declarationChecked || !aiAcknowledged || loading}
              onClick={handleSubmit}
            >
              {loading ? <Loader2 className={styles.spinner} size={16} /> : <Shield size={16} />}
              Submit to Department
            </button>
          )}
        </div>
        {attachmentWarning && (
          <div className={styles.warningMessage}>
            <AlertCircle size={18} /> {attachmentWarning}
          </div>
        )}
        {error && <div className={styles.errorMessage}><AlertCircle size={18} /> Error: {error}</div>}
      </div>
    </div>
  );
};

