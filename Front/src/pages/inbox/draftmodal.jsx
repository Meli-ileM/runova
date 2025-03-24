import { useState, useEffect } from 'react';
import { Paperclip, Download, X, Send, Save } from 'lucide-react';

const DraftModal = ({ 
  draft, 
  onClose, 
  onSend, 
  onSave, 
  onDelete 
}) => {
  const [emailData, setEmailData] = useState({
    to: draft?.recipients?.to || [],
    cc: draft?.recipients?.cc || [],
    bcc: draft?.recipients?.bcc || [],
    subject: draft?.subject || '',
    body: draft?.body || '',
    attachments: draft?.attachments || []
  });

  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Format recipients for display in input fields
  const formatRecipients = (recipients) => {
    return recipients.map(r => 
      r.name ? `${r.name} <${r.email}>` : r.email
    ).join(', ');
  };

  // Handle adding attachments
  const addAttachment = (files) => {
    const newAttachments = Array.from(files).map(file => ({
      name: file.name,
      type: file.type,
      size: file.size,
      file: file,
      url: URL.createObjectURL(file)
    }));
    
    setEmailData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments]
    }));
  };

  // Handle removing attachment
  const removeAttachment = (index) => {
    const attachment = emailData.attachments[index];
    if (attachment.url) URL.revokeObjectURL(attachment.url);
    
    setEmailData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  // Handle sending the draft
  const handleSend = async () => {
    setIsSending(true);
    try {
      await onSend(emailData);
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  // Handle saving the draft
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(emailData);
    } finally {
      setIsSaving(false);
    }
  };

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      emailData.attachments.forEach(att => {
        if (att.url && att.url.startsWith('blob:')) {
          URL.revokeObjectURL(att.url);
        }
      });
    };
  }, []);

  return (
    <div className="modal-overlay">
      <div className="compose-modal">
        <div className="modal-header">
          <h3>Modifier le brouillon</h3>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="compose-form">
          <div className="form-field">
            <label>À:</label>
            <input
              type="text"
              value={formatRecipients(emailData.to)}
              onChange={(e) => {
                const emails = e.target.value.split(',').map(email => {
                  const trimmed = email.trim();
                  if (!trimmed) return null;
                  const emailMatch = trimmed.match(/<(.+)>/);
                  const nameMatch = trimmed.match(/(.+)</);
                  const [emailAddr, name] = trimmed.includes('<')
                    ? [emailMatch ? emailMatch[1] : trimmed, nameMatch ? nameMatch[1].trim() : '']
                    : [trimmed, ''];
                  return { email: emailAddr, name };
                }).filter(Boolean);
                
                setEmailData(prev => ({
                  ...prev,
                  to: emails
                }));
              }}
              placeholder="destinataire@exemple.com"
            />
          </div>
          
          <div className="form-field">
            <label>Cc:</label>
            <input
              type="text"
              value={formatRecipients(emailData.cc)}
              onChange={(e) => {
                const emails = e.target.value.split(',').map(email => {
                  const trimmed = email.trim();
                  if (!trimmed) return null;
                  const emailMatch = trimmed.match(/<(.+)>/);
                  const nameMatch = trimmed.match(/(.+)</);
                  const [emailAddr, name] = trimmed.includes('<')
                    ? [emailMatch ? emailMatch[1] : trimmed, nameMatch ? nameMatch[1].trim() : '']
                    : [trimmed, ''];
                  return { email: emailAddr, name };
                }).filter(Boolean);
                
                setEmailData(prev => ({
                  ...prev,
                  cc: emails
                }));
              }}
              placeholder="cc@exemple.com"
            />
          </div>
          
          <div className="form-field">
            <label>Bcc:</label>
            <input
              type="text"
              value={formatRecipients(emailData.bcc)}
              onChange={(e) => {
                const emails = e.target.value.split(',').map(email => {
                  const trimmed = email.trim();
                  if (!trimmed) return null;
                  const emailMatch = trimmed.match(/<(.+)>/);
                  const nameMatch = trimmed.match(/(.+)</);
                  const [emailAddr, name] = trimmed.includes('<')
                    ? [emailMatch ? emailMatch[1] : trimmed, nameMatch ? nameMatch[1].trim() : '']
                    : [trimmed, ''];
                  return { email: emailAddr, name };
                }).filter(Boolean);
                
                setEmailData(prev => ({
                  ...prev,
                  bcc: emails
                }));
              }}
              placeholder="bcc@exemple.com"
            />
          </div>
          
          <div className="form-field">
            <label>Sujet:</label>
            <input
              type="text"
              value={emailData.subject}
              onChange={(e) => setEmailData(prev => ({
                ...prev,
                subject: e.target.value
              }))}
              placeholder="Objet de l'email"
            />
          </div>
          
          <div className="form-field message-field">
            <label>Message:</label>
            <textarea
              value={emailData.body}
              onChange={(e) => setEmailData(prev => ({
                ...prev,
                body: e.target.value
              }))}
              placeholder="Contenu de votre message..."
              rows={10}
            />
          </div>
          
          <div className="attachment-section">
            <div className="attachment-controls">
              <label className="attachment-btn">
                <Paperclip size={16} />
                Joindre des fichiers
                <input
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => e.target.files && addAttachment(e.target.files)}
                />
              </label>
            </div>
            
            {emailData.attachments.length > 0 && (
              <div className="attachment-list">
                {emailData.attachments.map((attachment, idx) => (
                  <div className="attachment-item" key={idx}>
                    <div className="attachment-info">
                      <div className="attachment-name">{attachment.name}</div>
                      <div className="attachment-size">
                        {Math.round(attachment.size / 1024)} KB
                      </div>
                    </div>
                    <button
                      className="remove-attachment"
                      onClick={() => removeAttachment(idx)}
                      title="Supprimer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="form-actions">
            <button
              className="btn-primary send-btn"
              onClick={handleSend}
              disabled={!emailData.subject.trim() || 
                       !emailData.body.trim() || 
                       emailData.to.length === 0 ||
                       isSending}
            >
              <Send size={16} />
              {isSending ? 'Envoi en cours...' : 'Envoyer'}
            </button>
            
            <button
              className="btn-secondary save-btn"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save size={16} />
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            
            <button
              className="btn-danger delete-btn"
              onClick={onDelete}
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraftModal;