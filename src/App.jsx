import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table'
import './App.css'

// Documents to compare against master (SPA Version 1) - rows are Version 2, 3, and 4
const defaultData = [
  { 
    id: 1, 
    document: { name: 'SPA Version 2.pdf', type: 'pdf' },
    prompt_1: 'Price at GBP 22.5M (down from 25M). Escrow...',
    prompt_2: 'Notice period: 12 months (from 18). Liability...',
    prompt_3: 'Changed from England and Wales to New York la...',
  },
  { 
    id: 2, 
    document: { name: 'SPA Version 3.pdf', type: 'pdf' },
    prompt_1: 'Price at GBP 23.25M (between V1 and V2). Escro...',
    prompt_2: 'Notice period: 15 months (compromise). Liability...',
    prompt_3: 'Reverted to England and Wales law. England court...',
  },
  { 
    id: 3, 
    document: { name: 'SPA Version 4.pdf', type: 'pdf' },
    prompt_1: 'Same base price. Adds earn-out up to GBP 3M...',
    prompt_2: 'Adds claims basket of GBP 250,000. Notice 15...',
    prompt_3: 'Introduces LCIA arbitration. Separates governin...',
  },
]

// Full responses for the modal view
const fullResponses = {
  prompt_1: {
    1: 'Purchase Price reduced from GBP 25,000,000 to GBP 22,500,000. New escrow of GBP 2,000,000 introduced for 12 months from Completion to secure warranty claims. Balance paid by same-day electronic transfer.',
    2: 'Purchase Price at GBP 23,250,000 (between V1 and V2). Escrow reduced to GBP 1,500,000 for 9 months. Interest on Escrow Amount accrues for the benefit of the Seller.',
    3: 'Same base price as V3 (GBP 23,250,000). Adds earn-out clause of up to GBP 3,000,000 based on EBITDA performance for 12 months post-Completion, payable within 30 days of Earn-out Statement approval.',
  },
  prompt_2: {
    1: 'Notice period shortened from 18 months to 12 months. Liability cap reduced from 30% to 20% of Purchase Price. Disclosure Letter qualification added for warranty breaches.',
    2: 'Notice period: 15 months (compromise between 18 and 12). Liability cap: 25% (compromise between 30% and 20%). Fraud carve-out added - claims for fraud not subject to limitations.',
    3: 'Same as V3 (15 months notice, 25% cap, fraud carve-out). Introduces claims basket of GBP 250,000 - no claim may be brought unless aggregate exceeds basket, then only for excess.',
  },
  prompt_3: {
    1: 'Changed from England and Wales to New York law. Jurisdiction moved from England courts to state and federal courts sitting in New York County, New York.',
    2: 'Reverted to England and Wales law (same as V1). England courts jurisdiction retained. Added forum waiver clause - each party waives objection on grounds of inconvenient forum.',
    3: 'Introduces LCIA arbitration (London seat, English language, 3 arbitrators) instead of court jurisdiction. Separates governing law into own clause. Good faith negotiation required before arbitration.',
  },
}

// Default prompt columns - questions to ask about each document vs master
const defaultPromptColumns = [
  { id: 'prompt_1', prompt: 'Purchase price terms' },
  { id: 'prompt_2', prompt: 'Liability limitations' },
  { id: 'prompt_3', prompt: 'Governing law changes' },
]

// Document names for reference
const documentNames = {
  master: 'SPA Version 1.pdf',
  1: 'SPA Version 2.pdf',
  2: 'SPA Version 3.pdf',
}

// Mock responses comparing each document to master (SPA_Version_1)
const mockResponses = {
  prompt_1: {
    1: 'Price reduced from GBP 25M to GBP 22.5M. New escrow of GBP 2M for 12 months introduced.',
    2: 'Price at GBP 23.25M (between V1 and V2). Escrow reduced to GBP 1.5M for 9 months. Interest accrues to Seller.',
    3: 'Same base price as V3. Adds earn-out up to GBP 3M based on EBITDA performance.',
  },
  prompt_2: {
    1: 'Notice period shortened: 18 months to 12 months. Liability cap reduced: 30% to 20%. Disclosure Letter qualification added.',
    2: 'Notice period: 15 months (compromise). Liability cap: 25% (compromise). Fraud carve-out added - not subject to limitations.',
    3: 'Same as V3 plus claims basket of GBP 250,000. Claims only for excess over basket.',
  },
  prompt_3: {
    1: 'Changed from England and Wales to New York law. Jurisdiction moved to NY state/federal courts.',
    2: 'Reverted to England and Wales law. England courts with forum waiver clause added.',
    3: 'Introduces LCIA arbitration (London). Separates governing law into own clause.',
  },
}

// Document sections for side-by-side comparison (Master=SPA V1, docs: V2 and V3)
const mockDocumentSections = {
  prompt_1: {
    master: {
      title: '1. Purchase Price',
      content: `The Buyer shall pay to the Seller a purchase price of GBP 25,000,000 (the Purchase Price) on Completion.

The Purchase Price shall be paid in full by same-day electronic transfer to the bank account notified by the Seller no later than two Business Days prior to Completion.`
    },
    docs: {
      1: {
        title: '1. Purchase Price',
        content: `The Buyer shall pay to the Seller a purchase price of <del>GBP 25,000,000</del> <ins>GBP 22,500,000</ins> (the Purchase Price) on Completion.

<ins>An amount of GBP 2,000,000 shall be retained in escrow for 12 months from Completion to secure any warranty claims (the Escrow Amount).</ins>

The <del>Purchase Price shall be paid in full</del> <ins>balance of the Purchase Price shall be paid</ins> by same-day electronic transfer to the bank account notified by the Seller no later than two Business Days prior to Completion.`
      },
      2: {
        title: '1. Purchase Price',
        content: `The Buyer shall pay to the Seller a purchase price of <del>GBP 25,000,000</del> <ins>GBP 23,250,000</ins> (the Purchase Price) on Completion.

<ins>An amount of GBP 1,500,000 shall be retained in escrow for 9 months from Completion to secure any warranty claims (the Escrow Amount).</ins>

The <del>Purchase Price shall be paid in full</del> <ins>balance of the Purchase Price shall be paid in full</ins> by same-day electronic transfer to the bank account notified by the Seller no later than two Business Days prior to Completion.

<ins>Interest shall accrue on the Escrow Amount for the benefit of the Seller.</ins>`
      },
      3: {
        title: '1. Purchase Price',
        content: `The Buyer shall pay to the Seller a purchase price of <del>GBP 25,000,000</del> <ins>GBP 23,250,000</ins> (the Purchase Price) on Completion.

<ins>An amount of GBP 1,500,000 shall be retained in escrow for 9 months from Completion to secure any warranty claims (the Escrow Amount).</ins>

The <del>Purchase Price shall be paid in full</del> <ins>balance of the Purchase Price shall be paid in full</ins> by same-day electronic transfer to the bank account notified by the Seller no later than two Business Days prior to Completion.

<ins>Interest shall accrue on the Escrow Amount for the benefit of the Seller.</ins>

<ins>In addition, the Buyer shall pay an earn-out of up to GBP 3,000,000 based on EBITDA performance for the 12-month period following Completion, payable within 30 days of approval of the Earn-out Statement (clause 1A).</ins>`
      }
    }
  },
  prompt_2: {
    master: {
      title: '4. Limitations on Liability',
      content: `The Seller shall not be liable for any claim unless written notice is given within 18 months of Completion.

The aggregate liability of the Seller for all warranty claims shall not exceed 30% of the Purchase Price.

No party shall be liable for indirect or consequential loss, loss of profit, or loss of goodwill.`
    },
    docs: {
      1: {
        title: '4. Limitations on Liability',
        content: `The Seller shall not be liable for any claim unless written notice is given within <del>18 months</del> <ins>12 months</ins> of Completion.

The aggregate liability of the Seller for all warranty claims shall not exceed <del>30%</del> <ins>20%</ins> of the Purchase Price.

No party shall be liable for indirect or consequential loss, loss of profit, or loss of goodwill.`
      },
      2: {
        title: '4. Limitations on Liability',
        content: `The Seller shall not be liable for any claim unless written notice is given within <del>18 months</del> <ins>15 months</ins> of Completion.

The aggregate liability of the Seller for all warranty claims shall not exceed <del>30%</del> <ins>25%</ins> of the Purchase Price.

No party shall be liable for indirect or consequential loss, loss of profit, or loss of goodwill.

<ins>Any claim for fraud shall not be subject to the limitations in this clause 4.</ins>`
      },
      3: {
        title: '4. Limitations on Liability',
        content: `The Seller shall not be liable for any claim unless written notice is given within <del>18 months</del> <ins>15 months</ins> of Completion.

The aggregate liability of the Seller for all warranty claims shall not exceed <del>30%</del> <ins>25%</ins> of the Purchase Price.

No party shall be liable for indirect or consequential loss, loss of profit, or loss of goodwill.

<ins>Any claim for fraud shall not be subject to the limitations in this clause 4.</ins>

<ins>No claim may be brought unless and until the aggregate amount of claims exceeds GBP 250,000 (the Basket), and then only for the excess over the Basket.</ins>`
      }
    }
  },
  prompt_3: {
    master: {
      title: '6. Governing Law and Jurisdiction',
      content: `This Agreement and any dispute arising out of or in connection with it shall be governed by the laws of England and Wales.

The courts of England and Wales shall have exclusive jurisdiction to settle any dispute arising out of or in connection with this Agreement.`
    },
    docs: {
      1: {
        title: '6. Governing Law and Jurisdiction',
        content: `This Agreement and any dispute arising out of or in connection with it shall be governed by the laws of <del>England and Wales</del> <ins>New York</ins>.

The <del>courts of England and Wales</del> <ins>state and federal courts sitting in New York County, New York</ins> shall have exclusive jurisdiction to settle any dispute arising out of or in connection with this Agreement.`
      },
      2: {
        title: '6. Governing Law and Jurisdiction',
        content: `This Agreement and any dispute arising out of or in connection with it shall be governed by the laws of England and Wales.

The courts of England and Wales shall have exclusive jurisdiction to settle any dispute arising out of or in connection with this Agreement.

<ins>Each party irrevocably waives any objection to those courts on the grounds of inconvenient forum.</ins>`
      },
      3: {
        title: '6. Dispute Resolution & 7. Governing Law',
        content: `<ins>6. Dispute Resolution</ins>

<ins>Any dispute arising out of or in connection with this Agreement shall first be referred to the parties' general counsel for good faith negotiation for a period of 15 Business Days.</ins>

<ins>If the dispute is not resolved, it shall be finally settled by arbitration under the LCIA Rules by three arbitrators seated in London, and the language of the arbitration shall be English.</ins>

<ins>7. Governing Law</ins>

This Agreement and any <ins>non-contractual obligations arising out of or in connection with it</ins> shall be governed by the laws of England and Wales.

<del>The courts of England and Wales shall have exclusive jurisdiction to settle any dispute arising out of or in connection with this Agreement.</del>`
      }
    }
  }
}

const EditableCell = ({ getValue, row, column, table }) => {
  const initialValue = getValue()
  const [value, setValue] = useState(initialValue)
  const textareaRef = useRef(null)
  
  const cellId = `${row.index}-${column.id}`
  const meta = table.options.meta
  const isSelected = meta?.selectedCells?.has(cellId)
  const isEditing = meta?.editingCell === cellId
  const hasComment = meta?.comments?.[cellId]
  const isActiveComment = meta?.activeComment === cellId

  const autoResize = (el) => {
    if (el) {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  }

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus()
          autoResize(textareaRef.current)
        }
      }, 0)
    }
  }, [isEditing])

  const onBlur = () => {
    meta?.setEditingCell(null)
    meta?.updateData(row.index, column.id, value)
  }

  const handleMouseDown = (e) => {
    if (isEditing) return
    
    e.preventDefault()
    meta?.selectCell(cellId, e.shiftKey, row.index, column.id)
    if (!e.shiftKey) {
      meta?.setEditingCell(cellId)
    }
    
    if (hasComment) {
      meta?.setActiveComment(cellId)
      meta?.setOpenedComment(cellId)
    } else {
      meta?.setActiveComment(null)
      meta?.clearCommentView()
    }
  }

  const handleChange = (e) => {
    setValue(e.target.value)
    autoResize(e.target)
  }

  const handleCommentClick = (e) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    meta?.openCommentMenu(cellId, rect.right + 8, rect.top)
  }

  if (isEditing) {
    return (
      <div className="cell-editor-wrapper">
        <textarea
          ref={textareaRef}
          className="cell-editor"
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          autoFocus
        />
        <button 
          className="cell-comment-btn"
          onMouseDown={handleCommentClick}
          title={hasComment ? "Edit comment" : "Add comment"}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M14 1H2C1.44772 1 1 1.44772 1 2V11C1 11.5523 1.44772 12 2 12H5L8 15L11 12H14C14.5523 12 15 11.5523 15 11V2C15 1.44772 14.5523 1 14 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {hasComment && <span className="comment-dot" />}
        </button>
      </div>
    )
  }

  const cellClasses = [
    'cell-display',
    isSelected ? 'cell-selected' : '',
    hasComment ? 'cell-has-comment' : '',
    isActiveComment ? 'cell-comment-active' : ''
  ].filter(Boolean).join(' ')

  return (
    <div 
      className={cellClasses}
      onMouseDown={handleMouseDown}
    >
      {hasComment && <span className="comment-indicator" />}
      {value || <span className="placeholder">Click to edit</span>}
    </div>
  )
}

// PDF Icon component - orange/coral color
const PdfIcon = () => (
  <svg width="14" height="18" viewBox="0 0 14 18" fill="none" className="pdf-icon">
    <path d="M8.5 0H1.5C0.671573 0 0 0.671573 0 1.5V16.5C0 17.3284 0.671573 18 1.5 18H12.5C13.3284 18 14 17.3284 14 16.5V5.5L8.5 0Z" fill="#EA4335"/>
    <path d="M8.5 0V5.5H14L8.5 0Z" fill="#FFCDD2"/>
    <text x="7" y="13" textAnchor="middle" fill="white" fontSize="5" fontWeight="600" fontFamily="Inter, sans-serif">PDF</text>
  </svg>
)

// Document cell component for the first column
const DocumentCell = ({ getValue, row, column, table }) => {
  const document = getValue()
  const cellId = `${row.index}-${column.id}`
  const meta = table.options.meta
  const isSelected = meta?.selectedCells?.has(cellId)

  const handleMouseDown = (e) => {
    e.preventDefault()
    meta?.selectCell(cellId, e.shiftKey, row.index, column.id)
  }

  const cellClasses = [
    'cell-display',
    'document-cell',
    isSelected ? 'cell-selected' : ''
  ].filter(Boolean).join(' ')

  if (!document) {
    return (
      <div className={cellClasses} onMouseDown={handleMouseDown}>
        <span className="placeholder">No document</span>
      </div>
    )
  }

  return (
    <div className={cellClasses} onMouseDown={handleMouseDown}>
      <div className="document-content">
        <PdfIcon />
        <span className="document-name">{document.name}</span>
      </div>
    </div>
  )
}

// Prompt Response Cell - shows comparison result
const PromptCell = ({ getValue, row, column, table }) => {
  const value = getValue()
  const cellId = `${row.index}-${column.id}`
  const meta = table.options.meta
  const isSelected = meta?.selectedCells?.has(cellId)
  const hasMaster = meta?.masterDocument
  const isComparing = meta?.isComparing
  const rowData = row.original

  const handleMouseDown = (e) => {
    e.preventDefault()
    meta?.selectCell(cellId, e.shiftKey, row.index, column.id)
  }

  const handleClick = (e) => {
    e.stopPropagation()
    if (value && meta?.openSideBySide) {
      // Get the full response for the modal
      const fullResponse = fullResponses[column.id]?.[rowData.id] || value
      meta.openSideBySide({
        promptId: column.id,
        docId: rowData.id,
        document: rowData.document,
        summary: fullResponse,
        promptText: column.columnDef.header
      })
    }
  }

  const cellClasses = [
    'cell-display',
    'prompt-cell',
    isSelected ? 'cell-selected' : '',
    value ? 'has-response clickable' : '',
  ].filter(Boolean).join(' ')

  if (!hasMaster) {
    return (
      <div className={cellClasses} onMouseDown={handleMouseDown}>
        <span className="prompt-empty">Upload master to compare</span>
      </div>
    )
  }

  if (isComparing && !value) {
    return (
      <div className={cellClasses} onMouseDown={handleMouseDown}>
        <span className="prompt-loading">
          <span className="loading-dots">
            <span></span><span></span><span></span>
          </span>
          Analyzing...
        </span>
      </div>
    )
  }

  if (!value) {
    return (
      <div className={cellClasses} onMouseDown={handleMouseDown}>
        <span className="prompt-waiting">Run comparison</span>
      </div>
    )
  }

  return (
    <div className={cellClasses} onMouseDown={handleMouseDown} onClick={handleClick}>
      <span className="prompt-response">{value}</span>
      <svg className="cell-expand-icon" width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M7 1H11M11 1V5M11 1L6 6M5 11H1V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  )
}

const defaultColumn = {
  cell: EditableCell,
}

const CommentMenu = ({ position, cellId, onClose, onSave, existingComment }) => {
  const [comment, setComment] = useState(existingComment || '')

  const handleSave = () => {
    onSave(cellId, comment)
    onClose()
  }

  const handleDelete = () => {
    onSave(cellId, '')
    onClose()
  }

  return (
    <div 
      className="comment-menu"
      style={{ top: position.y, left: position.x }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="comment-menu-header">
        <span>{existingComment ? 'Edit Comment' : 'Add Comment'}</span>
        <button className="comment-menu-close" onClick={onClose}>×</button>
      </div>
      <textarea
        className="comment-input"
        placeholder="Enter your comment..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        autoFocus
      />
      <div className="comment-menu-actions">
        {existingComment && (
          <button className="comment-btn comment-btn-delete" onClick={handleDelete}>
            Delete
          </button>
        )}
        <button className="comment-btn comment-btn-save" onClick={handleSave}>
          Save
        </button>
      </div>
    </div>
  )
}

// Dropdown Menu Component
const DropdownMenu = ({ isOpen, onClose, anchorRef, children }) => {
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && 
          anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose, anchorRef])

  if (!isOpen) return null

  return (
    <div className="dropdown-menu" ref={menuRef}>
      {children}
    </div>
  )
}

// Upload Modal Component
const UploadModal = ({ isOpen, onClose, onUpload }) => {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  if (!isOpen) return null

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type === 'application/pdf') {
      onUpload(file)
      onClose()
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      onUpload(file)
      onClose()
    }
  }

  const handleOverlayClick = (e) => {
    e.stopPropagation()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="upload-modal-header">
          <h2>Upload Master Document</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M11 3L3 11M3 3L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <p className="upload-modal-desc">
          Upload a master document to compare all documents against.
        </p>
        <div 
          className={`upload-dropzone ${isDragging ? 'dropzone-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="dropzone-icon">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 24V12M18 12L12 18M18 12L24 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 24V28C6 29.6569 7.34315 31 9 31H27C28.6569 31 30 29.6569 30 28V24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="dropzone-text">Drag & drop PDF here</p>
          <p className="dropzone-subtext">or click to browse</p>
          <input 
            ref={fileInputRef}
            type="file" 
            accept=".pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
        <div className="upload-modal-footer">
          <span className="file-type-hint">PDF format</span>
        </div>
      </div>
    </div>
  )
}

// Documents list for the panel
const allDocuments = [
  { id: 'master', name: 'SPA Version 1.pdf', type: 'master' },
  { id: 1, name: 'SPA Version 2.pdf', type: 'comparison' },
  { id: 2, name: 'SPA Version 3.pdf', type: 'comparison' },
  { id: 3, name: 'SPA Version 4.pdf', type: 'comparison' },
]

// Column definitions for the center panel
const columnDefinitions = [
  { id: 'prompt_1', name: 'Purchase price terms', icon: '≡' },
  { id: 'prompt_2', name: 'Liability limitations', icon: '≡' },
  { id: 'prompt_3', name: 'Governing law changes', icon: '≡' },
]

// Side-by-Side Comparison Panel - Three Panel Layout
const SideBySidePanel = ({ isOpen, onClose, masterDoc, compareDoc, promptId, docId, summary, promptText, allData }) => {
  const [selectedDocId, setSelectedDocId] = useState(docId)
  const [selectedColumnId, setSelectedColumnId] = useState(promptId)
  const [expandedReasonings, setExpandedReasonings] = useState({})
  const [viewMode, setViewMode] = useState('documents') // 'documents' or 'columns'
  const [splitView, setSplitView] = useState(true) // Default to split view
  const documentListRef = useRef(null)
  
  // Update selected document and column when dialog opens or props change
  useEffect(() => {
    if (isOpen && docId !== undefined && docId !== null) {
      setSelectedDocId(docId)
    }
  }, [isOpen, docId])
  
  useEffect(() => {
    if (isOpen && promptId) {
      setSelectedColumnId(promptId)
    }
  }, [isOpen, promptId])

  // Keyboard navigation for document list
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return
    
    const currentIndex = allDocuments.findIndex(doc => doc.id === selectedDocId)
    
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextIndex = Math.min(currentIndex + 1, allDocuments.length - 1)
      setSelectedDocId(allDocuments[nextIndex].id)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prevIndex = Math.max(currentIndex - 1, 0)
      setSelectedDocId(allDocuments[prevIndex].id)
    } else if (e.key === 'Escape') {
      onClose()
    }
  }, [isOpen, selectedDocId, onClose])

  // Add keyboard listener when dialog is open
  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])
  
  if (!isOpen) return null

  const sections = mockDocumentSections[selectedColumnId]
  const currentDocSection = sections?.docs?.[selectedDocId]
  
  // Parse content with diff markup
  const renderContent = (html) => {
    return { __html: html }
  }

  const handleOverlayClick = (e) => {
    e.stopPropagation()
    onClose()
  }

  const toggleReasoning = (colId) => {
    setExpandedReasonings(prev => ({
      ...prev,
      [colId]: !prev[colId]
    }))
  }

  // Get answer for a specific document and column
  const getAnswer = (docId, colId) => {
    return fullResponses[colId]?.[docId] || '—'
  }

  // Get document by id
  const getDocById = (id) => {
    if (id === 'master') return { name: masterDoc?.name || 'SPA Version 1.pdf' }
    return allDocuments.find(d => d.id === id)
  }

  const selectedDoc = getDocById(selectedDocId)

  return (
    <div className="dialog-overlay" onClick={handleOverlayClick}>
      <div className="dialog-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dialog-header">
          <div className="dialog-header-left">
            <span className="dialog-breadcrumb">A quite small boy</span>
            <span className="dialog-separator">/</span>
            <span className="dialog-title">{selectedDoc?.name}</span>
          </div>
          <div className="dialog-header-right">
            <button className="dialog-action-btn">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              Mark document as reviewed
            </button>
            <div className="dialog-view-toggles">
              <button 
                className={`view-toggle ${viewMode === 'documents' ? 'active' : ''}`}
                onClick={() => setViewMode('documents')}
                title="Documents first"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="2" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M7 4H13M7 7H13M7 10H13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </button>
              <button 
                className={`view-toggle ${viewMode === 'columns' ? 'active' : ''}`}
                onClick={() => setViewMode('columns')}
                title="Columns first"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 4H7M1 7H7M1 10H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <rect x="9" y="2" width="4" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
              </button>
            </div>
            <button className="dialog-close-btn" onClick={onClose}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M11 3L3 11M3 3L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Three-panel content */}
        <div className="dialog-content">
          {/* Left Panel - Documents or Columns based on view mode */}
          <div className={`dialog-left-panel ${viewMode === 'columns' ? 'columns-view' : ''}`}>
            {viewMode === 'columns' ? (
              /* Columns Panel */
              <>
                <div className="panel-header">
                  <span className="panel-title">Columns</span>
                  <span className="panel-count">{columnDefinitions.length}</span>
                  <div className="panel-actions">
                    <span className="jump-to-label">Jump to</span>
                    <button className="panel-action-icon">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="columns-list">
                  {columnDefinitions.map((col) => {
                    const answer = selectedDocId === 'master' 
                      ? 'Master document - baseline for comparison'
                      : getAnswer(selectedDocId, col.id)
                    const isExpanded = expandedReasonings[col.id]
                    const isSelected = selectedColumnId === col.id
                    
                    return (
                      <div 
                        key={col.id} 
                        className={`column-field ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedColumnId(col.id)}
                      >
                        <div className="field-header">
                          <div className="field-title">
                            <span className="field-icon">≡</span>
                            <span className="field-name">{col.name}</span>
                          </div>
                          <div className="field-actions">
                            <button className="field-action-icon" title="Flag">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M2 1V11M2 1L10 3.5L2 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                            <button className="field-action-icon" title="Comment">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M10 1H2C1.44772 1 1 1.44772 1 2V8C1 8.55228 1.44772 9 2 9H4L6 11L8 9H10C10.5523 9 11 8.55228 11 8V2C11 1.44772 10.5523 1 10 1Z" stroke="currentColor" strokeWidth="1.1"/>
                              </svg>
                            </button>
                            <button className="field-action-icon" title="Status">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1"/>
                                <path d="M4 6L5.5 7.5L8 4.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="field-content">
                          <div className="field-label">Answer</div>
                          <div className="field-answer">
                            <span className="answer-text">{answer}</span>
                            <button className="edit-btn">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M8.5 1.5L10.5 3.5M1 11L1.5 8.5L9 1L11 3L3.5 10.5L1 11Z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="field-reasoning">
                          <button 
                            className="reasoning-toggle"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleReasoning(col.id)
                            }}
                          >
                            <svg 
                              width="10" height="10" viewBox="0 0 10 10" fill="none"
                              style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                            >
                              <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>Reasoning</span>
                          </button>
                          <div className="reasoning-badges">
                            <span className="reasoning-badge">1</span>
                            <span className="reasoning-badge">2</span>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="reasoning-content">
                            <p>Based on comparison with the master document, the following changes were identified in this section...</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              /* Documents Panel */
              <>
            <div className="panel-header">
              <span className="panel-title">Documents</span>
              <span className="panel-count">{allDocuments.length}</span>
              <div className="panel-actions">
                <button className="panel-action-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </button>
                <button className="panel-action-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 4H12M5 7H12M2 10H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="document-list">
              {allDocuments.map((doc, index) => (
                <div 
                  key={doc.id}
                  className={`document-list-item ${selectedDocId === doc.id ? 'selected' : ''} ${doc.type === 'master' ? 'master-item' : ''}`}
                  onClick={() => setSelectedDocId(doc.id)}
                >
                  <span className="doc-index">{index + 1}.</span>
                  <PdfIcon />
                  <span className="doc-list-name">{doc.name}</span>
                  {doc.type === 'master' && <span className="master-badge">Master</span>}
                </div>
              ))}
            </div>
              </>
            )}
          </div>

          {/* Center Panel - Documents or Columns based on view mode */}
          <div className={`dialog-center-panel ${viewMode === 'columns' ? 'documents-view' : ''}`}>
            {viewMode === 'columns' ? (
              /* Documents Panel in center */
              <>
                <div className="panel-header">
                  <span className="panel-title">Documents</span>
                  <span className="panel-count">{allDocuments.length}</span>
                  <div className="panel-actions">
                    <button className="panel-action-icon">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </button>
                    <button className="panel-action-icon">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 4H12M5 7H12M2 10H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="document-list">
                  {allDocuments.map((doc, index) => (
                    <div 
                      key={doc.id}
                      className={`document-list-item ${selectedDocId === doc.id ? 'selected' : ''} ${doc.type === 'master' ? 'master-item' : ''}`}
                      onClick={() => setSelectedDocId(doc.id)}
                    >
                      <span className="doc-index">{index + 1}.</span>
                      <PdfIcon />
                      <span className="doc-list-name">{doc.name}</span>
                      {doc.type === 'master' && <span className="master-badge">Master</span>}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              /* Columns Panel in center */
              <>
            <div className="panel-header">
              <span className="panel-title">Columns</span>
              <span className="panel-count">{columnDefinitions.length}</span>
              <div className="panel-actions">
                <span className="jump-to-label">Jump to</span>
                <button className="panel-action-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button className="panel-action-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 4L5 7L2 10M8 4H12M8 10H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className="columns-list">
              {columnDefinitions.map((col) => {
                const answer = selectedDocId === 'master' 
                  ? 'Master document - baseline for comparison'
                  : getAnswer(selectedDocId, col.id)
                const isExpanded = expandedReasonings[col.id]
                const isSelected = selectedColumnId === col.id
                
                return (
                  <div 
                    key={col.id} 
                    className={`column-field ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedColumnId(col.id)}
                  >
                    <div className="field-header">
                      <div className="field-title">
                        <span className="field-icon">≡</span>
                        <span className="field-name">{col.name}</span>
                      </div>
                      <div className="field-actions">
                        <button className="field-action-icon" title="Flag">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 1V11M2 1L10 3.5L2 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button className="field-action-icon" title="Comment">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M10 1H2C1.44772 1 1 1.44772 1 2V8C1 8.55228 1.44772 9 2 9H4L6 11L8 9H10C10.5523 9 11 8.55228 11 8V2C11 1.44772 10.5523 1 10 1Z" stroke="currentColor" strokeWidth="1.1"/>
                          </svg>
                        </button>
                        <button className="field-action-icon" title="Status">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.1"/>
                            <path d="M4 6L5.5 7.5L8 4.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="field-content">
                      <div className="field-label">Answer</div>
                      <div className="field-answer">
                        <span className="answer-text">{answer}</span>
                        <button className="edit-btn">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M8.5 1.5L10.5 3.5M1 11L1.5 8.5L9 1L11 3L3.5 10.5L1 11Z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="field-reasoning">
                      <button 
                        className="reasoning-toggle"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleReasoning(col.id)
                        }}
                      >
                        <svg 
                          width="10" height="10" viewBox="0 0 10 10" fill="none"
                          style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                        >
                          <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Reasoning</span>
                      </button>
                      <div className="reasoning-badges">
                        <span className="reasoning-badge">1</span>
                        <span className="reasoning-badge">2</span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="reasoning-content">
                        <p>Based on comparison with the master document, the following changes were identified in this section...</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
              </>
            )}
          </div>

          {/* Right Panel - Document Diff Preview */}
          <div className="dialog-right-panel">
            <div className="document-preview-header">
              <div className="preview-title">
                <span>{selectedDoc?.name}</span>
                {selectedDocId === 'master' && <span className="master-badge">Master</span>}
              </div>
              <div className="preview-actions">
                <button 
                  className={`preview-action-icon ${splitView ? 'active' : ''}`} 
                  title="Split View"
                  onClick={() => setSplitView(!splitView)}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="2" width="5" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                    <rect x="8" y="2" width="5" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                </button>
                <div className="preview-action-divider"></div>
                <button className="preview-action-icon" title="Zoom">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    <path d="M4 6H8M6 4V8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </button>
                <button className="preview-action-icon" title="Fit">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 5V2H5M9 2H12V5M12 9V12H9M5 12H2V9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button className="preview-action-icon" title="Print">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M3.5 5V1.5H10.5V5M3.5 10H2C1.44772 10 1 9.55228 1 9V6C1 5.44772 1.44772 5 2 5H12C12.5523 5 13 5.44772 13 6V9C13 9.55228 12.5523 10 12 10H10.5M3.5 8H10.5V12.5H3.5V8Z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button className="preview-action-icon" title="Search">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
            <div className={`document-preview-content ${splitView ? 'split-view' : ''}`}>
              {splitView && selectedDocId !== 'master' && currentDocSection ? (
                /* Split View - Show Master and Comparison aligned by paragraph */
                <div className="split-preview">
                  <div className="split-header-row">
                    <div className="split-column-header master-header">
                      <PdfIcon />
                      <span>SPA Version 1.pdf</span>
                      <span className="master-badge">Master</span>
                    </div>
                    <div className="split-column-header comparison-header">
                      <PdfIcon />
                      <span>{selectedDoc?.name}</span>
                      <span className="diff-badge">Diff</span>
                    </div>
                  </div>
                  <div className="split-content">
                    <div className="split-title-row">
                      <div className="split-cell master-cell">
                        <div className="preview-section-title">{sections?.master?.title}</div>
                      </div>
                      <div className="split-cell comparison-cell">
                        <div className="preview-section-title">{currentDocSection?.title}</div>
                      </div>
                    </div>
                    {(() => {
                      // Parse master paragraphs
                      const masterParagraphs = sections?.master?.content?.split('\n\n') || []
                      
                      // Parse comparison paragraphs and detect insertions
                      const compContent = currentDocSection?.content || ''
                      const compParagraphs = compContent.split('\n\n')
                      
                      // Build aligned rows
                      const alignedRows = []
                      let masterIdx = 0
                      let compIdx = 0
                      
                      while (masterIdx < masterParagraphs.length || compIdx < compParagraphs.length) {
                        const masterPara = masterParagraphs[masterIdx] || ''
                        const compPara = compParagraphs[compIdx] || ''
                        
                        // Check if comparison paragraph is entirely new (starts with <ins>)
                        const isFullyInserted = compPara.trim().startsWith('<ins>') && 
                                                compPara.trim().endsWith('</ins>') &&
                                                !compPara.includes('<del>')
                        
                        // Check if this paragraph was deleted (exists in master but fully deleted in comp)
                        const isFullyDeleted = compPara.trim().startsWith('<del>') && 
                                               compPara.trim().endsWith('</del>') &&
                                               !compPara.includes('<ins>')
                        
                        if (isFullyInserted && masterIdx < masterParagraphs.length) {
                          // New paragraph inserted - show empty on master side
                          alignedRows.push({
                            master: '',
                            comparison: compPara,
                            type: 'inserted'
                          })
                          compIdx++
                        } else if (isFullyDeleted) {
                          // Paragraph deleted - show on master, empty on comparison
                          alignedRows.push({
                            master: masterPara,
                            comparison: compPara,
                            type: 'deleted'
                          })
                          masterIdx++
                          compIdx++
                        } else {
                          // Normal or modified paragraph
                          alignedRows.push({
                            master: masterPara,
                            comparison: compPara,
                            type: 'normal'
                          })
                          masterIdx++
                          compIdx++
                        }
                      }
                      
                      return alignedRows.map((row, i) => (
                        <div key={i} className={`split-row ${row.type}`}>
                          <div className={`split-cell master-cell ${row.type === 'inserted' ? 'empty-cell' : ''}`}>
                            <div className="preview-text">
                              {row.master}
                            </div>
                          </div>
                          <div className={`split-cell comparison-cell ${row.type === 'deleted' ? 'deleted-cell' : ''}`}>
                            <div 
                              className="preview-text preview-diff"
                              dangerouslySetInnerHTML={renderContent(row.comparison)}
                            />
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              ) : selectedDocId === 'master' ? (
                <div className="preview-document">
                  <div className="preview-page">
                    <div className="preview-section">
                      <div className="preview-section-title">{sections?.master?.title}</div>
                      <div className="preview-text">
                        {sections?.master?.content}
                      </div>
                    </div>
                  </div>
                </div>
              ) : currentDocSection ? (
                <div className="preview-document">
                  <div className="preview-page">
                    <div className="preview-section">
                      <div className="preview-section-title">{currentDocSection.title}</div>
                      <div 
                        className="preview-text preview-diff" 
                        dangerouslySetInnerHTML={renderContent(currentDocSection.content)} 
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="preview-empty">
                  <p>Select a document and column to view comparison</p>
                </div>
              )}
            </div>
            <div className="document-preview-footer">
              <button className="page-nav-btn">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M8 10L4 6L8 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <span className="page-indicator">1/3</span>
              <button className="page-nav-btn">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div className="zoom-controls">
                <button className="zoom-btn">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.1"/>
                    <path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                    <path d="M3.5 5.5H7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                  </svg>
                </button>
                <span className="zoom-level">105%</span>
                <button className="zoom-btn">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.1"/>
                    <path d="M8.5 8.5L11 11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                    <path d="M3.5 5.5H7.5M5.5 3.5V7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Master Document Banner
const MasterBanner = ({ document, onClear, onCompare, isComparing, comparisonComplete }) => {
  return (
    <div className="master-banner">
      <div className="master-banner-content">
        <span className="master-label">Master</span>
        <span className="master-doc-name">{document.name}</span>
      </div>
      <div className="master-banner-actions">
        {comparisonComplete ? (
          <span className="comparison-complete-badge">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M13.5 4.5L6 12L2.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Done
          </span>
        ) : (
          <button 
            className="compare-action-btn" 
            onClick={onCompare}
            disabled={isComparing}
          >
            {isComparing ? (
              <>
                <span className="spinner"></span>
                Comparing...
              </>
            ) : (
              'Run Comparison'
            )}
          </button>
        )}
        <button className="clear-master-btn" onClick={onClear} title="Remove master">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// Sidebar Component
const Sidebar = () => {
  return (
    <div className="sidebar">
      <div className="sidebar-icon active">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="11" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="1" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      </div>
      <div className="sidebar-divider" />
      <div className="sidebar-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1V15M1 8H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="sidebar-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="sidebar-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M5 7H11M5 10H9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="sidebar-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 3H14M2 8H14M2 13H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div className="sidebar-divider" />
      <div className="sidebar-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="sidebar-icon">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M5 8H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  )
}

// Onboarding Modal Component
function OnboardingModal({ onClose, onGetStarted }) {
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 200)
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  return (
    <div className={`onboarding-overlay ${isClosing ? 'closing' : ''}`} onClick={handleOverlayClick}>
      <div className={`onboarding-modal ${isClosing ? 'closing' : ''}`}>
        <button className="onboarding-close" onClick={handleClose}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        
        <div className="onboarding-content">
          <div className="onboarding-left">
            <div className="onboarding-preview">
              <img 
                src="/onboarding-preview.png" 
                alt="Mass Compare Preview" 
                className="onboarding-image"
              />
            </div>
          </div>
          
          <div className="onboarding-right">
            <div className="onboarding-header">
              <span className="onboarding-subtitle">Get started with</span>
              <h1 className="onboarding-title">Mass Compare</h1>
            </div>
            
            <div className="onboarding-features">
              <div className="onboarding-feature">
                <div className="feature-indicator"></div>
                <div className="feature-content">
                  <h3>Compare document versions</h3>
                  <p>Upload multiple document versions and compare them against a master document. Instantly see what changed.</p>
                </div>
              </div>
              
              <div className="onboarding-feature">
                <div className="feature-indicator"></div>
                <div className="feature-content">
                  <h3>Side-by-side diff view</h3>
                  <p>View documents side by side with highlighted insertions, deletions, and modifications.</p>
                </div>
              </div>
              
              <div className="onboarding-feature">
                <div className="feature-indicator"></div>
                <div className="feature-content">
                  <h3>Track all changes</h3>
                  <p>Keep track of every change across all document versions in one organized table view.</p>
                </div>
              </div>
            </div>
            
            <div className="onboarding-actions">
              <button className="onboarding-btn secondary" onClick={handleClose}>
                Cancel
              </button>
              <button className="onboarding-btn primary" onClick={handleClose}>
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [data, setData] = useState(defaultData)
  const [selectedCells, setSelectedCells] = useState(new Set())
  const [editingCell, setEditingCell] = useState(null)
  const [anchorCell, setAnchorCell] = useState(null)
  const [comments, setComments] = useState({})
  const [commentMenu, setCommentMenu] = useState(null)
  const [activeComment, setActiveComment] = useState(null)
  const [openedComment, setOpenedComment] = useState(null)
  const [shouldClearView, setShouldClearView] = useState(false)
  
  // Prompt columns state
  const [promptColumns, setPromptColumns] = useState(defaultPromptColumns)
  const columnsRef = useRef(['document', ...defaultPromptColumns.map(p => p.id)])
  
  // Master document state - pre-loaded with SPA Version 1
  const [masterDocument, setMasterDocument] = useState({
    name: 'SPA Version 1.pdf',
    uploadedAt: new Date()
  })
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showCompareMenu, setShowCompareMenu] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [isComparing, setIsComparing] = useState(false)
  const [comparisonComplete, setComparisonComplete] = useState(true)
  const compareButtonRef = useRef(null)
  
  // Side-by-side comparison state
  const [sideBySideData, setSideBySideData] = useState(null)

  const openSideBySide = useCallback((data) => {
    setSideBySideData(data)
  }, [])

  const closeSideBySide = useCallback(() => {
    setSideBySideData(null)
  }, [])

  const handleMasterUpload = (file) => {
    setMasterDocument({
      name: file.name,
      file: file,
      uploadedAt: new Date()
    })
    setComparisonComplete(false)
    setData(prev => prev.map(row => ({ id: row.id, document: row.document })))
  }

  const handleClearMaster = () => {
    setMasterDocument(null)
    setComparisonComplete(false)
    setData(prev => prev.map(row => ({ id: row.id, document: row.document })))
  }

  const handleRunComparison = () => {
    setIsComparing(true)
    setTimeout(() => {
      setData(prev => prev.map((row) => {
        const newRow = { ...row }
        promptColumns.forEach(col => {
          const responses = mockResponses[col.id] || {}
          newRow[col.id] = responses[row.id] || ''
        })
        return newRow
      }))
      setIsComparing(false)
      setComparisonComplete(true)
    }, 1500)
  }

  // Add a new prompt column
  const addPromptColumn = () => {
    const newId = `prompt_${promptColumns.length + 1}`
    const newColumn = { id: newId, prompt: 'Ask a question...' }
    setPromptColumns(prev => [...prev, newColumn])
    columnsRef.current = ['document', ...promptColumns.map(p => p.id), newId]
  }

  // Build columns array dynamically
  const columns = [
    { accessorKey: 'document', header: 'Document', size: 200, minSize: 180, cell: DocumentCell },
    ...promptColumns.map(col => ({
      accessorKey: col.id,
      header: col.prompt,
      size: 280,
      minSize: 200,
      cell: PromptCell,
    }))
  ]

  const updateData = useCallback((rowIndex, columnId, value) => {
    setData((old) =>
      old.map((row, index) => {
        if (index === rowIndex) {
          return { ...row, [columnId]: value }
        }
        return row
      })
    )
  }, [])

  const selectCell = useCallback((cellId, isShiftKey, rowIndex, columnId) => {
    if (isShiftKey && anchorCell) {
      const [anchorRow, anchorCol] = anchorCell
      const colOrder = columnsRef.current
      const anchorColIndex = colOrder.indexOf(anchorCol)
      const currentColIndex = colOrder.indexOf(columnId)
      
      const minRow = Math.min(anchorRow, rowIndex)
      const maxRow = Math.max(anchorRow, rowIndex)
      const minCol = Math.min(anchorColIndex, currentColIndex)
      const maxCol = Math.max(anchorColIndex, currentColIndex)
      
      const newSelection = new Set()
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          newSelection.add(`${r}-${colOrder[c]}`)
        }
      }
      setSelectedCells(newSelection)
    } else {
      setSelectedCells(new Set([cellId]))
      setAnchorCell([rowIndex, columnId])
    }
    setEditingCell(null)
  }, [anchorCell])

  const openCommentMenu = useCallback((cellId, x, y) => {
    setCommentMenu({ cellId, position: { x, y } })
  }, [])

  const closeCommentMenu = useCallback(() => {
    setCommentMenu(null)
  }, [])

  const saveComment = useCallback((cellId, text) => {
    setComments((prev) => {
      const next = { ...prev }
      if (text) {
        next[cellId] = text
      } else {
        delete next[cellId]
      }
      return next
    })
  }, [])


  const addRow = () => {
    setData((old) => [
      ...old,
      { id: old.length + 1, document: null },
    ])
  }

  const handleContainerClick = (e) => {
    if (commentMenu) {
      closeCommentMenu()
    }
    if (e.target.classList.contains('table-area') || 
        e.target.classList.contains('main-content')) {
      setSelectedCells(new Set())
      setEditingCell(null)
      setAnchorCell(null)
      setActiveComment(null)
    }
  }

  const table = useReactTable({
    data,
    columns,
    defaultColumn,
    getCoreRowModel: getCoreRowModel(),
    meta: { 
      updateData, 
      selectedCells, 
      selectCell, 
      editingCell, 
      setEditingCell,
      comments,
      openCommentMenu,
      activeComment,
      setActiveComment,
      setOpenedComment,
      clearCommentView: () => setShouldClearView(true),
      masterDocument,
      isComparing,
      openSideBySide,
    },
  })

  return (
    <div className="app" onClick={handleContainerClick}>
      <Sidebar />
      
      <div className="main-content">
        {/* Header with breadcrumb */}
        <header className="header">
          <div className="header-left">
            <div className="breadcrumb">
              <div className="breadcrumb-item">
                <span className="breadcrumb-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="1" width="12" height="12" rx="2" fill="#EA4335"/>
                  </svg>
                </span>
                Trade-Secrets Litigati...
              </div>
              <span className="breadcrumb-separator">/</span>
              <div className="breadcrumb-item">Tabular Review</div>
              <span className="breadcrumb-separator">/</span>
              <div className="breadcrumb-item current">
                <span className="breadcrumb-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="1" width="4" height="12" rx="1" fill="#EA4335"/>
                    <rect x="6" y="1" width="3" height="12" rx="1" fill="#EA4335" fillOpacity="0.6"/>
                    <rect x="10" y="1" width="3" height="12" rx="1" fill="#EA4335" fillOpacity="0.3"/>
                  </svg>
                </span>
                Service Agreements
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>
          
          <div className="header-right">
            <div className="user-avatars">
              <div className="avatar" style={{ background: '#00875a' }}>JD</div>
              <div className="avatar" style={{ background: '#2383e2' }}>BB</div>
              <div className="avatar" style={{ background: '#EA4335' }}>PF</div>
              <div className="avatar avatar-count">3</div>
            </div>
            <div className="header-divider" />
            <button className="header-btn">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M11 7.5V11.5C11 12.0523 10.5523 12.5 10 12.5H3C2.44772 12.5 2 12.0523 2 11.5V4.5C2 3.94772 2.44772 3.5 3 3.5H7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M9 1.5H12.5V5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M6 8.5L12.5 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Share
            </button>
            <button className="header-btn">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Download
            </button>
          </div>
        </header>

        {/* Toolbar */}
        <div className="toolbar">
          <button className="toolbar-btn">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Add document
          </button>
          <button className="toolbar-btn">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
              <rect x="8" y="1" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            Add column
          </button>
          <button className="toolbar-btn">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1.5" y="2.5" width="11" height="9" rx="1" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M1.5 5.5H12.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M5 5.5V11.5" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            Templates
          </button>
          
          <div className="toolbar-spacer" />
          
          <div className="compare-menu-wrapper">
            <button 
              ref={compareButtonRef}
              className="toolbar-btn toolbar-btn-outline compare-btn"
              onClick={() => setShowCompareMenu(!showCompareMenu)}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                <rect x="8" y="1" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M4 5H10M4 7H10M4 9H10" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.5"/>
              </svg>
              Compare
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={showCompareMenu ? 'chevron-up' : ''}>
                <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <DropdownMenu 
              isOpen={showCompareMenu} 
              onClose={() => setShowCompareMenu(false)}
              anchorRef={compareButtonRef}
            >
              <button 
                className="menu-item"
                onClick={() => {
                  setShowUploadModal(true)
                  setShowCompareMenu(false)
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1V9M7 1L4 4M7 1L10 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 9V12C1 12.5523 1.44772 13 2 13H12C12.5523 13 13 12.5523 13 12V9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                Upload master document
              </button>
              {masterDocument && (
                <>
                  <div className="menu-divider" />
                  <button 
                    className="menu-item"
                    onClick={() => {
                      handleRunComparison()
                      setShowCompareMenu(false)
                    }}
                    disabled={isComparing}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 4H10M4 7H12M2 10H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    {isComparing ? 'Comparing...' : 'Run comparison'}
                  </button>
                  <button 
                    className="menu-item menu-item-danger"
                    onClick={() => {
                      handleClearMaster()
                      setShowCompareMenu(false)
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M10 4L4 10M4 4L10 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                    Remove master
                  </button>
                </>
              )}
            </DropdownMenu>
          </div>
          
          <button className="toolbar-btn">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 3.5H13M5 7H13M1 10.5H13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Language
          </button>
          <button className="toolbar-btn">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M4 7L6.5 9.5L10 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Run
          </button>
        </div>

        {masterDocument && (
          <MasterBanner 
            document={masterDocument}
            onClear={handleClearMaster}
            onCompare={handleRunComparison}
            isComparing={isComparing}
            comparisonComplete={comparisonComplete}
          />
        )}

        {/* Table Area */}
        <div className="table-area">
          <div className="spreadsheet-container">
            <div className="table-wrapper">
              <table className="spreadsheet">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      <th className="row-number-header"></th>
                      {headerGroup.headers.map((header, index) => {
                        const isPromptColumn = index > 0
                        return (
                          <th
                            key={header.id}
                            style={{ width: header.getSize() }}
                          >
                            <div className="column-header">
                              {isPromptColumn && (
                                <svg className="column-header-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                                  <path d="M2 4H12M2 7H12M2 10H12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                </svg>
                              )}
                              <span className="column-header-text">
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                              </span>
                            </div>
                          </th>
                        )
                      })}
                      <th className="add-column-header">
                        <button className="add-column-btn" onClick={addPromptColumn} title="Add column">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M7 3V11M3 7H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </th>
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row, rowIndex) => (
                    <tr key={row.id}>
                      <td className="row-number-cell">{rowIndex + 1}</td>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} style={{ width: cell.column.getSize() }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                      <td className="add-column-spacer"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="add-row-area">
              <button className="add-row-btn" onClick={addRow}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                New
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {commentMenu && (
        <CommentMenu
          position={commentMenu.position}
          cellId={commentMenu.cellId}
          onClose={closeCommentMenu}
          onSave={saveComment}
          existingComment={comments[commentMenu.cellId]}
        />
      )}
      
      <UploadModal 
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleMasterUpload}
      />
      
      <SideBySidePanel
        isOpen={!!sideBySideData}
        onClose={closeSideBySide}
        masterDoc={masterDocument}
        compareDoc={sideBySideData?.document}
        promptId={sideBySideData?.promptId}
        docId={sideBySideData?.docId}
        summary={sideBySideData?.summary}
        promptText={sideBySideData?.promptText}
      />
      
      {showOnboarding && (
        <OnboardingModal 
          onClose={() => setShowOnboarding(false)}
          onGetStarted={() => setShowOnboarding(false)}
        />
      )}
    </div>
  )
}

export default App
