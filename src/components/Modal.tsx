import React from 'react'

interface ModalProps {
  title?: string
  description?: string
  children: React.ReactNode
  onClose: () => void
  large?: boolean
}

export default function Modal({ title, description, children, onClose, large }: ModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal ${large ? 'modal-large' : ''}`} onClick={(e) => e.stopPropagation()}>
        {title ? <h3 className="modal-title">{title}</h3> : null}
        {description ? <p className="modal-desc">{description}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  )
}
