import { useState, useCallback, useRef, useEffect } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table'
import './App.css'

// Documents to compare against master - each row is a document (pre-filled with results)
const defaultData = [
  { 
    id: 1, 
    document: { name: 'SPA_Version_2.pdf', type: 'pdf' },
    prompt_1: 'Price reduced from GBP 25M to GBP 22.5M. New escrow of GBP 2M for 12 months introduced.',
    prompt_2: 'Notice period shortened: 18 months to 12 months. Liability cap reduced: 30% to 20%. Disclosure Letter qualification added.',
    prompt_3: 'Changed from England and Wales to New York law. Jurisdiction moved to NY state/federal courts.',
  },
  { 
    id: 2, 
    document: { name: 'SPA_Version_3.pdf', type: 'pdf' },
    prompt_1: 'Price at GBP 23.25M (between V1 and V2). Escrow reduced to GBP 1.5M for 9 months. Interest accrues to Seller.',
    prompt_2: 'Notice period: 15 months (compromise). Liability cap: 25% (compromise). Fraud carve-out added - not subject to limitations.',
    prompt_3: 'Reverted to England and Wales law. England courts with forum waiver clause added.',
  },
]

// Default prompt columns - questions to ask about each document vs master
const defaultPromptColumns = [
  { id: 'prompt_1', prompt: 'What are the key differences in purchase price terms?' },
  { id: 'prompt_2', prompt: 'How do the liability limitations differ?' },
  { id: 'prompt_3', prompt: 'What governing law changes were made?' },
]

// Mock responses comparing each document to master (SPA_Version_1)
const mockResponses = {
  prompt_1: {
    1: 'Price reduced from GBP 25M to GBP 22.5M. New escrow of GBP 2M for 12 months introduced.',
    2: 'Price at GBP 23.25M (between V1 and V2). Escrow reduced to GBP 1.5M for 9 months. Interest accrues to Seller.',
  },
  prompt_2: {
    1: 'Notice period shortened: 18 months to 12 months. Liability cap reduced: 30% to 20%. Disclosure Letter qualification added.',
    2: 'Notice period: 15 months (compromise). Liability cap: 25% (compromise). Fraud carve-out added - not subject to limitations.',
  },
  prompt_3: {
    1: 'Changed from England and Wales to New York law. Jurisdiction moved to NY state/federal courts.',
    2: 'Reverted to England and Wales law. England courts with forum waiver clause added.',
  },
}

// Mock document sections for side-by-side comparison (V1=master, V2=doc 1, V3=doc 2)
const mockDocumentSections = {
  prompt_1: {
    master: {
      title: '1. Purchase Price',
      content: `The Buyer shall pay to the Seller a purchase price of GBP 25,000,000 (the "Purchase Price") on Completion.

The Purchase Price shall be paid in full by same-day electronic transfer to the bank account notified by the Seller no later than two Business Days prior to Completion.`
    },
    docs: {
      1: {
        title: '1. Purchase Price',
        content: `The Buyer shall pay to the Seller a purchase price of <del>GBP 25,000,000</del> <ins>GBP 22,500,000</ins> (the "Purchase Price") on Completion.

<ins>An amount of GBP 2,000,000 shall be retained in escrow for 12 months from Completion to secure any warranty claims (the "Escrow Amount").</ins>

The <del>Purchase Price shall be paid in full</del> <ins>balance of the Purchase Price shall be paid</ins> by same-day electronic transfer to the bank account notified by the Seller no later than two Business Days prior to Completion.`
      },
      2: {
        title: '1. Purchase Price',
        content: `The Buyer shall pay to the Seller a purchase price of <del>GBP 25,000,000</del> <ins>GBP 23,250,000</ins> (the "Purchase Price") on Completion.

<ins>An amount of GBP 1,500,000 shall be retained in escrow for 9 months from Completion to secure any warranty claims (the "Escrow Amount").</ins>

The <del>Purchase Price shall be paid in full</del> <ins>balance of the Purchase Price shall be paid</ins> by same-day electronic transfer to the bank account notified by the Seller no later than two Business Days prior to Completion.

<ins>Interest shall accrue on the Escrow Amount for the benefit of the Seller.</ins>`
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
      // Small delay to ensure DOM is ready
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
    
    e.preventDefault() // Prevent focus loss
    
    // Open cell for editing immediately
    meta?.selectCell(cellId, e.shiftKey, row.index, column.id)
    if (!e.shiftKey) {
      meta?.setEditingCell(cellId)
    }
    
    // Set active comment if this cell has a comment
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

// PDF Icon component
const PdfIcon = () => (
  <svg width="16" height="20" viewBox="0 0 20 24" fill="none" className="pdf-icon">
    <path d="M12 0H2C0.9 0 0 0.9 0 2V22C0 23.1 0.9 24 2 24H18C19.1 24 20 23.1 20 22V8L12 0Z" fill="#E53935"/>
    <path d="M12 0V8H20L12 0Z" fill="#FFCDD2"/>
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
      meta.openSideBySide({
        promptId: column.id,
        docId: rowData.id,
        document: rowData.document,
        summary: value,
        promptText: column.columnDef.header
      })
    }
  }

  // Determine styling based on content
  const getResponseClass = () => {
    if (!value) return ''
    if (value.toLowerCase().includes('reverted')) return 'response-reverted'
    if (value.toLowerCase().includes('changed') || value.toLowerCase().includes('reduced') || value.toLowerCase().includes('shortened')) return 'response-warning'
    return ''
  }

  const cellClasses = [
    'cell-display',
    'prompt-cell',
    isSelected ? 'cell-selected' : '',
    value ? 'has-response clickable' : '',
    getResponseClass()
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
  const inputRef = useRef(null)

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
        ref={inputRef}
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
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <path d="M24 32V16M24 16L18 22M24 16L30 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 32V38C8 40.2091 9.79086 42 12 42H36C38.2091 42 40 40.2091 40 38V32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
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

// Side-by-Side Comparison Panel
const SideBySidePanel = ({ isOpen, onClose, masterDoc, compareDoc, promptId, docId, summary, promptText }) => {
  const [showAll, setShowAll] = useState(false)
  
  if (!isOpen) return null

  const sections = mockDocumentSections[promptId]
  if (!sections) return null

  const masterSection = sections.master
  const docSection = sections.docs?.[docId]
  if (!docSection) return null

  // Parse content with diff markup
  const renderContent = (html) => {
    return { __html: html }
  }

  const handleOverlayClick = (e) => {
    e.stopPropagation()
    onClose()
  }

  return (
    <div className="sidebyside-overlay" onClick={handleOverlayClick}>
      <div className={`sidebyside-panel ${showAll ? 'panel-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="sidebyside-header">
          <h2>Document Comparison</h2>
          <div className="header-actions">
            <button 
              className={`see-all-btn ${showAll ? 'active' : ''}`}
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show 2' : 'See All 3'}
            </button>
            <button className="sidebyside-close" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
        
        {summary && (
          <div className="sidebyside-summary">
            <div className="summary-question">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 12V7M8 5V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {promptText}
            </div>
            <div className="summary-answer">{summary}</div>
          </div>
        )}
        
        <div className={`sidebyside-content ${showAll ? 'three-way' : ''}`}>
          <div className="sidebyside-doc master-side">
            <div className="doc-header">
              <span className="doc-label">V1 - Master</span>
              <span className="doc-name">{masterDoc?.name || 'SPA_Version_1.pdf'}</span>
            </div>
            <div className="doc-section">
              <h3>{masterSection.title}</h3>
              <div className="doc-text">{masterSection.content}</div>
            </div>
          </div>
          <div className="sidebyside-divider" />
          {showAll && sections.docs?.[1] && (
            <>
              <div className="sidebyside-doc v2-side">
                <div className="doc-header">
                  <span className="doc-label v2-label">V2</span>
                  <span className="doc-name">SPA_Version_2.pdf</span>
                </div>
                <div className="doc-section">
                  <h3>{sections.docs[1].title}</h3>
                  <div className="doc-text doc-diff" dangerouslySetInnerHTML={renderContent(sections.docs[1].content)} />
                </div>
              </div>
              <div className="sidebyside-divider" />
            </>
          )}
          <div className="sidebyside-doc compare-side">
            <div className="doc-header">
              <span className="doc-label">{showAll ? 'V3' : 'Comparing'}</span>
              <span className="doc-name">{showAll ? 'SPA_Version_3.pdf' : (compareDoc?.name || 'Document')}</span>
            </div>
            <div className="doc-section">
              <h3>{showAll ? sections.docs?.[2]?.title : docSection.title}</h3>
              <div className="doc-text doc-diff" dangerouslySetInnerHTML={renderContent(showAll ? sections.docs?.[2]?.content : docSection.content)} />
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
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

const CommentsPanel = ({ comments, onCommentHover, onDeleteComment, activeComment, openedComment, onClearOpenedComment, shouldClearView, onClearViewHandled }) => {
  const [viewingComment, setViewingComment] = useState(null)
  const commentEntries = Object.entries(comments).filter(([, text]) => text)
  
  // When a cell with a comment is clicked, show it in detail view
  useEffect(() => {
    if (openedComment && comments[openedComment]) {
      setViewingComment(openedComment)
      onClearOpenedComment()
    }
  }, [openedComment, comments, onClearOpenedComment])
  
  // When a cell without a comment is clicked, clear the detail view
  useEffect(() => {
    if (shouldClearView) {
      setViewingComment(null)
      onClearViewHandled()
    }
  }, [shouldClearView, onClearViewHandled])
  
  // Detail view for a single comment
  if (viewingComment) {
    const [rowIndex, columnId] = viewingComment.split('-')
    const commentText = comments[viewingComment]
    
    if (!commentText) {
      setViewingComment(null)
      return null
    }
    
    return (
      <div className="comments-panel">
        <div className="comments-panel-header">
          <button 
            className="back-btn"
            onClick={() => {
              setViewingComment(null)
              onCommentHover(null)
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
        </div>
        <div className="comment-detail">
          <div className="comment-detail-header">
            <span className="comment-cell-ref">
              Row {parseInt(rowIndex) + 1}, {columnId}
            </span>
            <button 
              className="comment-item-delete"
              onClick={() => {
                onDeleteComment(viewingComment)
                setViewingComment(null)
              }}
            >
              ×
            </button>
          </div>
          <p className="comment-detail-text">{commentText}</p>
        </div>
      </div>
    )
  }
  
  if (commentEntries.length === 0) {
    return (
      <div className="comments-panel">
        <div className="comments-panel-header">
          <h2>Comments</h2>
        </div>
        <div className="comments-empty">
          <p>No comments yet</p>
          <p className="comments-hint">Edit a cell and click the comment icon to add a comment</p>
        </div>
      </div>
    )
  }

  return (
    <div className="comments-panel">
      <div className="comments-panel-header">
        <h2>Comments</h2>
        <span className="comments-count">{commentEntries.length}</span>
      </div>
      <div className="comments-list">
        {commentEntries.map(([cellId, text]) => {
          const [rowIndex, columnId] = cellId.split('-')
          const isActive = activeComment === cellId
          return (
            <div 
              key={cellId} 
              className={`comment-item ${isActive ? 'comment-item-active' : ''}`}
              onClick={() => onCommentHover(cellId)}
            >
              <div className="comment-item-header">
                <span className="comment-cell-ref">
                  Row {parseInt(rowIndex) + 1}, {columnId}
                </span>
                <button 
                  className="comment-item-delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteComment(cellId)
                  }}
                >
                  ×
                </button>
              </div>
              <p className="comment-text">{text}</p>
              <button 
                className="comment-item-expand"
                onClick={(e) => {
                  e.stopPropagation()
                  setViewingComment(cellId)
                  onCommentHover(cellId)
                }}
              >
                View full comment
              </button>
            </div>
          )
        })}
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
  
  // Master document state - pre-loaded with SPA_Version_1
  const [masterDocument, setMasterDocument] = useState({
    name: 'SPA_Version_1.pdf',
    uploadedAt: new Date()
  })
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showCompareMenu, setShowCompareMenu] = useState(false)
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
    // Clear previous responses
    setData(prev => prev.map(row => ({ id: row.id, document: row.document })))
  }

  const handleClearMaster = () => {
    setMasterDocument(null)
    setComparisonComplete(false)
    // Clear responses
    setData(prev => prev.map(row => ({ id: row.id, document: row.document })))
  }

  const handleRunComparison = () => {
    setIsComparing(true)
    // Simulate comparison - populate cells with mock responses
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
    { accessorKey: 'document', header: 'Document', size: 200, cell: DocumentCell },
    ...promptColumns.map(col => ({
      accessorKey: col.id,
      header: col.prompt,
      size: 280,
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
    if (e.target.classList.contains('spreadsheet-container') || 
        e.target.classList.contains('main')) {
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
      <header className="header">
        <div className="header-left">
          <h1>Document Compare</h1>
        </div>
        <div className="header-right">
          <div className="compare-menu-wrapper">
            <button 
              ref={compareButtonRef}
              className="compare-btn"
              onClick={() => setShowCompareMenu(!showCompareMenu)}
            >
              Compare
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={showCompareMenu ? 'chevron-up' : ''}>
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1V11M8 1L4 5M8 1L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1 11V14C1 14.5523 1.44772 15 2 15H14C14.5523 15 15 14.5523 15 14V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M2 4H10M6 8H14M2 12H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Remove master
                  </button>
                </>
              )}
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      {masterDocument && (
        <MasterBanner 
          document={masterDocument}
          onClear={handleClearMaster}
          onCompare={handleRunComparison}
          isComparing={isComparing}
          comparisonComplete={comparisonComplete}
        />
      )}
      
      <div className="app-content">
        <main className="main">
          <div className="spreadsheet-container">
            <div className="table-wrapper">
              <table className="spreadsheet">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header, index) => {
                        const isPromptColumn = index > 0
                        return (
                          <th
                            key={header.id}
                            style={{ width: header.getSize() }}
                            className={isPromptColumn ? 'prompt-header' : ''}
                          >
                            {isPromptColumn ? (
                              <div className="prompt-header-content">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="prompt-icon">
                                  <path d="M8 1V15M1 8H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                                <span className="prompt-text">
                                  {flexRender(
                                    header.column.columnDef.header,
                                    header.getContext()
                                  )}
                                </span>
                              </div>
                            ) : (
                              flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )
                            )}
                          </th>
                        )
                      })}
                      <th className="add-column-header">
                        <button className="add-column-btn" onClick={addPromptColumn} title="Add question column">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                      </th>
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
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
            <button className="add-row-btn" onClick={addRow}>
              + Add Row
            </button>
          </div>
        </main>
      </div>
      
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
    </div>
  )
}

export default App
