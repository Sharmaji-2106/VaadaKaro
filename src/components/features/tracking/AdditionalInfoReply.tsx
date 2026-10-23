'use client';

import React, { useState } from 'react';
import { Send, Paperclip, AlertCircle, CheckCircle2 } from 'lucide-react';
import { replyToInfoRequest } from '@/lib/actions/replyActions';

export default function AdditionalInfoReply({ complaintId }: { complaintId: string }) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('complaintId', complaintId);
    formData.append('message', message);

    const result = await replyToInfoRequest(formData);
    setIsSubmitting(false);

    if (result.success) {
      setIsSuccess(true);
      setMessage('');
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <CheckCircle2 size={40} className="mx-auto text-green-500 mb-3" />
        <h3 className="text-green-900 font-bold text-lg">Response Submitted</h3>
        <p className="text-green-700 text-sm mt-1">
          Your information has been successfully sent to the assigned officer. 
          The complaint status has been updated to "Under Review".
        </p>
        <button 
          onClick={() => setIsSuccess(false)}
          className="mt-4 text-green-700 font-bold text-sm underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 text-amber-800 mb-4">
        <AlertCircle size={20} />
        <h3 className="font-bold text-lg">Additional Information Required</h3>
      </div>
      
      <p className="text-amber-800 text-sm mb-4 leading-relaxed">
        The reviewing officer has requested more details to proceed with your case. 
        Please provide the requested information or upload the necessary documents below.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="relative">
          <textarea
            className="w-full bg-white border border-amber-200 rounded-lg p-4 text-sm focus:ring-2 focus:ring-amber-400 outline-none transition-all min-h-[120px]"
            placeholder="Type your response here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <div className="flex gap-2">
            <button 
              type="button"
              className="flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-2 rounded-md hover:bg-amber-200 transition-colors"
              title="Attachments coming soon"
              disabled
            >
              <Paperclip size={14} /> Add Documents
            </button>
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting || !message.trim()}
            className="flex items-center gap-2 bg-amber-600 text-white px-6 py-2 rounded-md text-sm font-bold hover:bg-amber-700 transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Sending...' : <><Send size={16} /> Send to Officer</>}
          </button>
        </div>
      </form>
    </div>
  );
}
