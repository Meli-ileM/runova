import React, { useState } from 'react';
import { X, Download, FileText, Image, FileVideo, File, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

const FileViewerModal = ({ isOpen, onClose, attachment }) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!isOpen || !attachment) return null;

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileType = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
      return 'image';
    }
    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
      return 'video';
    }
    if (['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(extension)) {
      return 'audio';
    }
    if (['pdf'].includes(extension)) {
      return 'pdf';
    }
    if (['txt', 'md', 'log', 'csv'].includes(extension)) {
      return 'text';
    }
    if (['doc', 'docx'].includes(extension)) {
      return 'document';
    }
    if (['xls', 'xlsx'].includes(extension)) {
      return 'spreadsheet';
    }
    if (['ppt', 'pptx'].includes(extension)) {
      return 'presentation';
    }
    return 'other';
  };

  const fileType = getFileType(attachment.name);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  const renderFileContent = () => {
    const fileUrl = attachment.url || '#';

    switch (fileType) {
      case 'image':
        return (
          <div className="image-viewer">
            <div className="image-controls">
              <button onClick={handleZoomOut} disabled={zoomLevel <= 0.25}>
                <ZoomOut size={16} />
              </button>
              <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={handleZoomIn} disabled={zoomLevel >= 3}>
                <ZoomIn size={16} />
              </button>
              <button onClick={handleRotate}>
                <RotateCw size={16} />
              </button>
              <button onClick={handleReset}>Reset</button>
            </div>
            <div className="image-container">
              <img 
                src={fileUrl}
                alt={attachment.name}
                style={{
                  transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'block';
                }}
              />
              <div className="error-message" style={{ display: 'none' }}>
                Impossible de charger l'image
              </div>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="video-viewer">
            <video 
              controls 
              style={{ width: '100%', maxHeight: '70vh' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            >
              <source src={fileUrl} />
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
            <div className="error-message" style={{ display: 'none' }}>
              Impossible de lire la vidéo
            </div>
          </div>
        );

      case 'audio':
        return (
          <div className="audio-viewer">
            <audio 
              controls 
              style={{ width: '100%' }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'block';
              }}
            >
              <source src={fileUrl} />
              Votre navigateur ne supporte pas la lecture audio.
            </audio>
            <div className="error-message" style={{ display: 'none' }}>
              Impossible de lire le fichier audio
            </div>
          </div>
        );

      case 'pdf':
        return (
          <div className="pdf-viewer">
            <iframe
              src={fileUrl}
              style={{ width: '100%', height: '70vh', border: 'none' }}
              title={`PDF: ${attachment.name}`}
              onError={() => {
                document.querySelector('.pdf-fallback').style.display = 'block';
              }}
            />
            <div className="pdf-fallback" style={{ display: 'none' }}>
              <p>Impossible d'afficher le PDF dans le navigateur.</p>
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                Ouvrir dans un nouvel onglet
              </a>
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="text-viewer">
            <div className="text-content">
              <p>Prévisualisation du fichier texte non disponible.</p>
              <p>Téléchargez le fichier pour le consulter.</p>
            </div>
          </div>
        );

      default:
        return (
          <div className="file-preview-unavailable">
            <div className="file-icon-large">
              <File size={64} />
            </div>
            <p>Prévisualisation non disponible pour ce type de fichier</p>
            <p className="file-info">
              Type: {attachment.name.split('.').pop().toUpperCase()}
            </p>
          </div>
        );
    }
  };

  const getFileIcon = () => {
    switch (fileType) {
      case 'image': return <Image size={20} />;
      case 'video': return <FileVideo size={20} />;
      case 'audio': return <File size={20} />;
      case 'pdf': return <FileText size={20} />;
      case 'text': return <FileText size={20} />;
      default: return <File size={20} />;
    }
  };

  return (
    <div className="file-viewer-overlay">
      <div className="file-viewer-modal">
        <div className="file-viewer-header">
          <div className="file-info-header">
            <div className="file-icon">
              {getFileIcon()}
            </div>
            <div className="file-details">
              <h3 className="file-name">{attachment.name}</h3>
              <span className="file-size">{formatFileSize(attachment.size)}</span>
            </div>
          </div>
          
          <div className="file-actions">
            <a 
              href={attachment.url || '#'}
              download={attachment.name}
              className="download-btn"
              title="Télécharger"
            >
              <Download size={18} />
            </a>
            <button 
              className="close-btn"
              onClick={onClose}
              title="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="file-viewer-content">
          {renderFileContent()}
        </div>
      </div>

      <style jsx>{`
        .file-viewer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .file-viewer-modal {
          background: white;
          border-radius: 12px;
          max-width: 90vw;
          max-height: 90vh;
          width: 800px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .file-viewer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
          background: #f8fafc;
        }

        .file-info-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .file-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: #e5e7eb;
          border-radius: 8px;
          color: #6b7280;
        }

        .file-details {
          display: flex;
          flex-direction: column;
        }

        .file-name {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }

        .file-size {
          font-size: 14px;
          color: #6b7280;
        }

        .file-actions {
          display: flex;
          gap: 8px;
        }

        .download-btn, .close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 6px;
          background: #f3f4f6;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }

        .download-btn:hover, .close-btn:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .file-viewer-content {
          flex: 1;
          padding: 20px;
          overflow: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .image-viewer {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .image-controls {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          align-items: center;
        }

        .image-controls button {
          padding: 6px 12px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .image-controls button:hover {
          background: #f3f4f6;
        }

        .image-controls button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .zoom-level {
          padding: 6px 12px;
          font-weight: 500;
          color: #374151;
        }

        .image-container {
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: auto;
          max-height: 60vh;
          width: 100%;
        }

        .video-viewer, .audio-viewer {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .pdf-viewer {
          width: 100%;
          height: 70vh;
        }

        .text-viewer {
          width: 100%;
          max-height: 60vh;
          overflow: auto;
        }

        .text-content {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          font-family: monospace;
        }

        .file-preview-unavailable {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 40px;
          text-align: center;
          color: #6b7280;
        }

        .file-icon-large {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          background: #f3f4f6;
          border-radius: 16px;
          color: #9ca3af;
        }

        .file-info {
          font-size: 14px;
          color: #9ca3af;
        }

        .error-message {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          color: #ef4444;
          font-weight: 500;
        }

        .pdf-fallback {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 40px;
          text-align: center;
        }

        .pdf-fallback a {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 500;
        }

        .pdf-fallback a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default FileViewerModal;