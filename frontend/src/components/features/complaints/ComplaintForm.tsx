'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './ComplaintForm.module.css';
import { Check, ChevronRight, ChevronLeft, Upload, Shield, AlertCircle, Loader2, Sparkles, FileText, Search, MapPin } from 'lucide-react';
import {
  submitComplaint,
  analyzeComplaint,
  uploadEvidence,
  ALLOWED_UPLOAD_TYPES,
  type UploadedAttachment,
} from '@/services/complaints';
import { DEPARTMENTS, categoriesFor } from '@/lib/departments';
import {
  DISTRICT_ALIASES,
  PIN_PATTERN,
  getDistricts,
  getStates,
  lookupPincode,
  matchState,
  normalize,
  type PinLookup,
  type StateOption,
} from '@/lib/locations';
import { SearchableSelect, type SelectOption } from '@/components/ui/SearchableSelect/SearchableSelect';
import { DependentSelect } from '@/components/ui/SearchableSelect/DependentSelect';

type Errors = Partial<Record<string, string>>;
type PinStatus = 'idle' | 'loading' | 'found' | 'not-found' | 'failed';

const DEPARTMENT_OPTIONS: SelectOption[] = DEPARTMENTS.map((d) => ({ value: d, label: d }));

const categoryOptions = (department: string): SelectOption[] =>
  categoriesFor(department).map((c) => ({ value: c, label: c }));

const districtOptions = async (stateCode: string): Promise<SelectOption[]> => {
  const aliases = DISTRICT_ALIASES[stateCode] ?? {};
  return (await getDistricts(stateCode)).map((d) => ({ value: d, label: d, keywords: aliases[d] }));
};

// Field order per step, used to focus the first invalid field.
const STEP_FIELDS: Record<number, string[]> = {
  1: ['title', 'department', 'category', 'description'],
  2: ['pincode', 'state', 'city', 'address'],
};

const fieldId = (field: string) => `cf-${field}`;

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
    stateCode: '',
    city: '',
    pincode: '',
    address: '',
    declaration: false,
    aiDisclaimer: false,
  });
  const [errors, setErrors] = useState<Errors>({});

  const [states, setStates] = useState<StateOption[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);
  const [pinStatus, setPinStatus] = useState<PinStatus>('idle');
  const [pinLookup, setPinLookup] = useState<PinLookup | null>(null);
  const pinRequest = useRef<AbortController | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [aiAcknowledged, setAiAcknowledged] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachmentWarning, setAttachmentWarning] = useState<string | null>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  useEffect(() => {
    getStates()
      .then(setStates)
      .finally(() => setStatesLoading(false));
  }, []);

  // Draft persistence. Drafts saved before these fields were dropdowns hold free text, so values
  // that don't match the lists are mapped where possible and otherwise cleared.
  useEffect(() => {
    const draft = localStorage.getItem('vdk_complaint_draft');
    if (!draft) return;
    let parsed: Partial<typeof formData>;
    try {
      parsed = JSON.parse(draft);
    } catch (e) {
      console.error("Failed to parse draft", e);
      return;
    }
    (async () => {
      if (parsed.department && !DEPARTMENTS.includes(parsed.department)) parsed.department = '';
      if (parsed.category && !categoriesFor(parsed.department || '').includes(parsed.category)) parsed.category = '';
      if (parsed.state && !parsed.stateCode) {
        const match = await matchState(parsed.state);
        parsed = match ? { ...parsed, state: match.name, stateCode: match.code } : { ...parsed, state: '', city: '' };
      }
      setFormData(prev => ({ ...prev, ...parsed }));
      // Re-check a saved PIN so the mismatch hint works, without overriding the saved choices.
      if (parsed.pincode && PIN_PATTERN.test(parsed.pincode)) runPinLookup(parsed.pincode, false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem('vdk_complaint_draft', JSON.stringify(formData));
  }, [formData]);

  useEffect(() => () => pinRequest.current?.abort(), []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = selectedFiles.filter(file => {
        const isValidSize = file.size <= 10 * 1024 * 1024;
        const isValidType = ALLOWED_UPLOAD_TYPES.includes(file.type);
        return isValidSize && isValidType;
      });

      if (validFiles.length < selectedFiles.length) {
        setError("Some files were rejected (too large or invalid type).");
      }
      setFiles(prev => [...prev, ...validFiles]);
    }
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

  const validateStep = async (s: number): Promise<Errors> => {
    const e: Errors = {};
    if (s === 1) {
      const title = formData.title.trim();
      if (title.length < 10) e.title = 'Enter a title of at least 10 characters.';
      else if (title.length > 150) e.title = 'Keep the title under 150 characters.';
      if (!formData.department) e.department = 'Select the department.';
      if (!formData.category) e.category = 'Select a category.';
      const description = formData.description.trim();
      if (description.length < 30) e.description = 'Describe the issue in at least 30 characters.';
      else if (description.length > 3000) e.description = 'Keep the description under 3000 characters.';
    }
    if (s === 2) {
      if (!PIN_PATTERN.test(formData.pincode)) e.pincode = 'Enter a valid 6-digit PIN code.';
      if (!formData.stateCode) e.state = 'Select your state or union territory.';
      if (!formData.city) {
        e.city = 'Select your district.';
      } else if (formData.stateCode) {
        const known = await getDistricts(formData.stateCode);
        const fromPin = pinLookup?.state?.code === formData.stateCode ? pinLookup.district : null;
        if (!known.includes(formData.city) && formData.city !== fromPin) e.city = 'Choose a district from the list.';
      }
      if (!formData.address.trim()) e.address = 'Enter the address or a nearby landmark.';
    }
    return e;
  };

  const handleNext = async () => {
    const stepErrors = await validateStep(step);
    setErrors(stepErrors);
    const firstInvalid = (STEP_FIELDS[step] ?? []).find((f) => stepErrors[f]);
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }
    setStep(prev => Math.min(prev + 1, 4));
  };
  const handleBack = () => {
    setErrors({});
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e?: React.FormEvent, confirmDuplicate = false) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setShowDuplicateWarning(false);

    try {
      const uploadedAttachments: UploadedAttachment[] = [];
      if (files.length > 0) {
        setUploading(true);
        // Files go straight to storage via presigned URLs; a failed upload doesn't block the complaint.
        const results = await Promise.all(files.map(uploadEvidence));
        for (const r of results) if (r) uploadedAttachments.push(r);
        if (uploadedAttachments.length < files.length) {
          setAttachmentWarning("Some attachments could not be uploaded. Your complaint will be submitted without them.");
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

  const clearError = (...fields: string[]) =>
    setErrors(prev => {
      if (!fields.some((f) => prev[f])) return prev;
      const next = { ...prev };
      for (const f of fields) delete next[f];
      return next;
    });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const handleDepartmentChange = (department: string) => {
    // The category list depends on the department, so a category from another department can't stay.
    setFormData(prev => (prev.department === department ? prev : { ...prev, department, category: '' }));
    clearError('department');
  };

  const handleStateChange = (code: string) => {
    const state = states.find((s) => s.code === code);
    setFormData(prev =>
      prev.stateCode === code ? prev : { ...prev, stateCode: code, state: state?.name ?? '', city: '' }
    );
    clearError('state');
  };

  const runPinLookup = async (pin: string, apply: boolean) => {
    pinRequest.current?.abort();
    const controller = new AbortController();
    pinRequest.current = controller;
    setPinStatus('loading');
    setPinLookup(null);
    try {
      const result = await lookupPincode(pin, controller.signal);
      if (controller.signal.aborted) return;
      if (!result || !result.state) {
        setPinStatus(result ? 'failed' : 'not-found');
        return;
      }
      setPinLookup(result);
      setPinStatus('found');
      if (apply) {
        setFormData(prev => ({ ...prev, stateCode: result.state!.code, state: result.state!.name, city: result.district }));
        clearError('state', 'city');
      }
    } catch {
      if (!controller.signal.aborted) setPinStatus('failed');
    }
  };

  const handlePinChange = (raw: string) => {
    const pin = raw.replace(/\D/g, '').slice(0, 6);
    updateField('pincode', pin);
    if (PIN_PATTERN.test(pin)) {
      if (pin !== pinLookup?.pin) runPinLookup(pin, true);
    } else {
      pinRequest.current?.abort();
      setPinLookup(null);
      setPinStatus('idle');
    }
  };

  const applyPinLocation = () => {
    if (!pinLookup?.state) return;
    setFormData(prev => ({ ...prev, stateCode: pinLookup.state!.code, state: pinLookup.state!.name, city: pinLookup.district }));
    clearError('state', 'city');
  };

  const pinMismatch =
    pinStatus === 'found' &&
    pinLookup?.state &&
    formData.stateCode &&
    formData.pincode === pinLookup.pin &&
    (formData.stateCode !== pinLookup.state.code || normalize(formData.city) !== normalize(pinLookup.district));

  // India Post sometimes names a district we don't list (e.g. "Mumbai"); still let the user pick it.
  const pinDistrictOption: SelectOption[] =
    pinLookup?.state && !pinLookup.districtInList && pinLookup.state.code === formData.stateCode
      ? [{ value: pinLookup.district, label: pinLookup.district }]
      : [];

  const stateOptions: SelectOption[] = states.map((s) => ({ value: s.code, label: s.name }));

  /** aria-describedby for a field: its hint (if any) and its error (if any). */
  const describedBy = (field: string, hasHint = false) =>
    [hasHint && `${fieldId(field)}-hint`, errors[field] && `${fieldId(field)}-error`].filter(Boolean).join(' ') || undefined;

  const fieldError = (field: string) =>
    errors[field] ? (
      <span id={`${fieldId(field)}-error`} className={styles.fieldError}>
        <AlertCircle size={15} aria-hidden="true" /> {errors[field]}
      </span>
    ) : null;

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
            <span className={styles.stepCount}>Step 1 of 4</span>
            <h2>What happened?</h2>
            <p className={styles.stepDesc}>Describe the issue clearly. More detail helps the officer act faster.</p>

            <div className={styles.inputGroup}>
              <label htmlFor={fieldId('title')}>Title</label>
              <span id={`${fieldId('title')}-hint`} className={styles.hint}>A short summary, at least 10 characters.</span>
              <input
                id={fieldId('title')}
                type="text"
                placeholder="e.g. Garbage dumped near the park"
                value={formData.title}
                maxLength={150}
                aria-invalid={!!errors.title || undefined}
                aria-describedby={describedBy('title', true)}
                onChange={(e) => updateField('title', e.target.value)}
              />
              {fieldError('title')}
            </div>

            <div className={styles.grid}>
              <div className={styles.inputGroup}>
                <label id={`${fieldId('department')}-label`} htmlFor={fieldId('department')}>Department</label>
                <SearchableSelect
                  id={fieldId('department')}
                  labelId={`${fieldId('department')}-label`}
                  value={formData.department}
                  options={DEPARTMENT_OPTIONS}
                  onChange={handleDepartmentChange}
                  placeholder="Select department"
                  invalid={!!errors.department}
                  describedBy={describedBy('department')}
                />
                {fieldError('department')}
              </div>
              <div className={styles.inputGroup}>
                <label id={`${fieldId('category')}-label`} htmlFor={fieldId('category')}>Category</label>
                <DependentSelect
                  id={fieldId('category')}
                  labelId={`${fieldId('category')}-label`}
                  parentValue={formData.department}
                  loadOptions={categoryOptions}
                  value={formData.category}
                  onChange={(v) => updateField('category', v)}
                  placeholder="Select category"
                  disabledPlaceholder="Select department first"
                  invalid={!!errors.category}
                  describedBy={describedBy('category')}
                />
                {fieldError('category')}
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor={fieldId('description')}>Description</label>
              <span id={`${fieldId('description')}-hint`} className={styles.hint}>At least 30 characters. Include when it happened and who was involved.</span>
              <textarea
                id={fieldId('description')}
                rows={6}
                placeholder="When did it happen, who was involved, and what have you tried so far?"
                value={formData.description}
                maxLength={3000}
                aria-invalid={!!errors.description || undefined}
                aria-describedby={describedBy('description', true)}
                onChange={(e) => updateField('description', e.target.value)}
              />
              {fieldError('description')}
              <button
                type="button"
                className={styles.aiAnalyzeBtn}
                onClick={handleAIAnalyze}
                disabled={!formData.description || !formData.title || !formData.department || !formData.category || aiLoading}
              >
                {aiLoading ? <Loader2 className={styles.spinner} size={14} /> : <Sparkles size={14} />}
                {aiLoading ? "Checking…" : "Check with AI"}
              </button>
            </div>

            {aiResult && (
              <div className={styles.aiFeedback}>
                <div className={styles.aiFeedbackHeader}>
                  <Shield size={16} />
                  <span>Quality check</span>
                   <div className={`${styles.scoreBadge} ${
                     aiResult.reliabilityLevel === 'HIGH' ? styles.scoreHigh :
                     aiResult.reliabilityLevel === 'MEDIUM' ? styles.scoreMedium : styles.scoreLow
                   }`}>
                     {Math.round(aiResult.reliabilityScore || 0)}% · {(aiResult.reliabilityLevel || "LOW").toLowerCase()}
                   </div>
                </div>
                <div className={styles.aiFeedbackBody}>
                  <p className={styles.feedbackText}>{aiResult.feedback}</p>
                  {aiResult.missingDetails?.length > 0 && (
                    <div className={styles.missingDetails}>
                      <strong>Consider adding</strong>
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
            <span className={styles.stepCount}>Step 2 of 4</span>
            <h2>Where is it?</h2>
            <p className={styles.stepDesc}>This routes your complaint to the right local authority.</p>

            <div className={styles.inputGroup}>
              <label htmlFor={fieldId('pincode')}>PIN Code</label>
              <span id={`${fieldId('pincode')}-hint`} className={styles.hint}>We fill in the state and district from it.</span>
              <input
                id={fieldId('pincode')}
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                // No maxLength: it would cut "431 001" to "431 00" before the digits are filtered.
                // handlePinChange keeps at most 6 digits.
                pattern="[1-9][0-9]{5}"
                placeholder="6-digit PIN number"
                className={styles.pinInput}
                value={formData.pincode}
                aria-invalid={!!errors.pincode || undefined}
                aria-describedby={[describedBy('pincode', true), `${fieldId('pincode')}-status`].filter(Boolean).join(' ')}
                onChange={(e) => handlePinChange(e.target.value)}
              />
              {fieldError('pincode')}
              <span id={`${fieldId('pincode')}-status`} className={styles.pinStatus} role="status" aria-live="polite">
                {pinStatus === 'loading' && <><Loader2 className={styles.spinner} size={15} aria-hidden="true" /> Looking up PIN…</>}
                {pinStatus === 'found' && pinLookup?.state && (
                  <><MapPin size={15} aria-hidden="true" /> {pinLookup.district}, {pinLookup.state.name}</>
                )}
                {pinStatus === 'not-found' && "We couldn't find this PIN. Check it, or choose your state and district below."}
                {pinStatus === 'failed' && "Couldn't look up this PIN right now. Choose your state and district below."}
              </span>
            </div>

            <div className={styles.grid}>
              <div className={styles.inputGroup}>
                <label id={`${fieldId('state')}-label`} htmlFor={fieldId('state')}>State / UT</label>
                <SearchableSelect
                  id={fieldId('state')}
                  labelId={`${fieldId('state')}-label`}
                  value={formData.stateCode}
                  options={stateOptions}
                  onChange={handleStateChange}
                  placeholder="Select state or UT"
                  loading={statesLoading}
                  invalid={!!errors.state}
                  describedBy={describedBy('state')}
                />
                {fieldError('state')}
              </div>
              <div className={styles.inputGroup}>
                <label id={`${fieldId('city')}-label`} htmlFor={fieldId('city')}>City / District</label>
                <DependentSelect
                  id={fieldId('city')}
                  labelId={`${fieldId('city')}-label`}
                  parentValue={formData.stateCode}
                  loadOptions={districtOptions}
                  extraOptions={pinDistrictOption}
                  value={formData.city}
                  onChange={(v) => updateField('city', v)}
                  placeholder="Select district"
                  disabledPlaceholder="Select state first"
                  invalid={!!errors.city}
                  describedBy={[describedBy('city'), pinMismatch && `${fieldId('city')}-pin-warning`].filter(Boolean).join(' ') || undefined}
                />
                {fieldError('city')}
              </div>
            </div>

            {pinMismatch && pinLookup?.state && (
              <div id={`${fieldId('city')}-pin-warning`} className={styles.pinWarning}>
                <AlertCircle size={16} aria-hidden="true" />
                <span>
                  PIN {pinLookup.pin} is in {pinLookup.district}, {pinLookup.state.name}. Check your selection.{' '}
                  <button type="button" className={styles.inlineBtn} onClick={applyPinLocation}>
                    Use {pinLookup.district}, {pinLookup.state.name}
                  </button>
                </span>
              </div>
            )}

            <div className={styles.inputGroup}>
              <label htmlFor={fieldId('address')}>Address or landmark</label>
              <textarea
                id={fieldId('address')}
                rows={3}
                placeholder="House no., street, nearby landmark"
                value={formData.address}
                maxLength={300}
                aria-invalid={!!errors.address || undefined}
                aria-describedby={describedBy('address')}
                onChange={(e) => updateField('address', e.target.value)}
              />
              {fieldError('address')}
            </div>
          </div>
        )}

        {step === 3 && (
           <div className={styles.stepContent}>
              <span className={styles.stepCount}>Step 3 of 4</span>
            <h2>Add evidence</h2>
              <p className={styles.stepDesc}>Photos, documents or past correspondence. Optional, but helpful.</p>

              <div className={styles.uploadArea}>
                <Upload size={28} className={styles.uploadIcon} />
                <p>{files.length > 0 ? `${files.length} files attached` : 'Choose files or drop them here'}</p>
                <small>PDF, JPG, PNG or WebP · up to 10 MB each</small>
                <input
                  type="file"
                  multiple
                  accept={ALLOWED_UPLOAD_TYPES.join(',')}
                  className={styles.fileInput}
                  onChange={handleFileChange}
                />
              </div>

              {files.length > 0 && (
                <div className={styles.fileList}>
                  {files.map((file, i) => (
                    <div key={i} className={styles.fileItem}>
                      <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
           </div>
        )}

        {step === 4 && (
           <div className={styles.stepContent}>
              <span className={styles.stepCount}>Step 4 of 4</span>
            <h2>Review and submit</h2>
              <p className={styles.stepDesc}>Check the details below before sending.</p>

              <div className={styles.reviewGrid}>
                 <div className={styles.reviewItem}>
                    <label>Title</label>
                    <p>{formData.title || 'Not specified'}</p>
                 </div>
                 <div className={styles.reviewItem}>
                    <label>Department</label>
                    <p>{formData.department} — {formData.category}</p>
                 </div>
                 <div className={styles.reviewItem}>
                    <label>Location</label>
                    <p>{formData.address}, {formData.city}, {formData.state} – {formData.pincode}</p>
                 </div>
                 <div className={styles.reviewItem}>
                    <label>Attachments</label>
                    <p>{files.length} files attached</p>
                 </div>
              </div>

              <div className={styles.declaration}>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={declarationChecked}
                    onChange={(e) => setDeclarationChecked(e.target.checked)}
                  />
                  <span>
                    I affirm that the facts stated in this grievance are true and accurate. I am aware that knowingly providing false information is an offence under Section 217 of the Bharatiya Nyaya Sanhita, 2023 (formerly Section 182 IPC).
                  </span>
                </label>
                <label className={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={aiAcknowledged}
                    onChange={(e) => setAiAcknowledged(e.target.checked)}
                  />
                  <span>
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
            <ChevronLeft size={16} /> Back
          </button>

          {step < 4 ? (
            <button type="button" className={styles.nextBtn} onClick={handleNext}>
              Continue
            </button>
          ) : (
            <button
              type="button"
              className={styles.submitBtn}
              disabled={!declarationChecked || !aiAcknowledged || loading}
              onClick={() => handleSubmit()}
            >
              {loading ? <Loader2 className={styles.spinner} size={16} /> : null}
              Submit
            </button>
          )}
        </div>
        {attachmentWarning && (
          <div className={styles.warningMessage}>
            <AlertCircle size={18} /> {attachmentWarning}
          </div>
        )}
        {error && <div className={styles.errorMessage}><AlertCircle size={18} /> {error}</div>}
        {showDuplicateWarning && (
          <button
            type="button"
            className={styles.duplicateBtn}
            onClick={() => handleSubmit(undefined, true)}
            disabled={loading}
          >
            It's a different issue, submit anyway
          </button>
        )}
      </div>
    </div>
  );
};
