/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Space } from '@arco-design/web-react';
import { IconAdd, IconClose } from '@icon-park/react';
import type { DealContext, DealParty, TransactionType, CompanyInfo, CreateDealInput } from '@/common/ma/types';
import styles from './DealForm.module.css';

interface DealFormProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Deal to edit (if editing) */
  deal?: DealContext | null;
  /** Callback when form is submitted */
  onSubmit: (data: CreateDealInput) => void;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Callback to validate input */
  validateInput?: (input: CreateDealInput) => Promise<{ valid: boolean; errors: string[] }>;
  /** Loading state */
  loading?: boolean;
}

const TRANSACTION_TYPES: { label: string; value: TransactionType }[] = [
  { label: 'Acquisition', value: 'acquisition' },
  { label: 'Merger', value: 'merger' },
  { label: 'Divestiture', value: 'divestiture' },
  { label: 'Joint Venture', value: 'joint_venture' },
];

const PARTY_ROLES: { label: string; value: DealParty['role'] }[] = [
  { label: 'Buyer', value: 'buyer' },
  { label: 'Seller', value: 'seller' },
  { label: 'Target', value: 'target' },
  { label: 'Advisor', value: 'advisor' },
];

const initialParty: DealParty = { name: '', role: 'buyer' };

const initialCompanyInfo: CompanyInfo = {
  name: '',
  industry: '',
  jurisdiction: '',
};

export function DealForm({
  visible,
  deal,
  onSubmit,
  onClose,
  validateInput,
  loading = false,
}: DealFormProps) {
  const [formData, setFormData] = useState<CreateDealInput>({
    name: '',
    parties: [{ ...initialParty }],
    transactionType: 'acquisition',
    targetCompany: { ...initialCompanyInfo },
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Reset form when modal opens/closes or deal changes
  useEffect(() => {
    if (visible) {
      if (deal) {
        setFormData({
          name: deal.name,
          parties: [...deal.parties],
          transactionType: deal.transactionType,
          targetCompany: { ...deal.targetCompany },
        });
      } else {
        setFormData({
          name: '',
          parties: [{ ...initialParty }],
          transactionType: 'acquisition',
          targetCompany: { ...initialCompanyInfo },
        });
      }
      setValidationErrors([]);
    }
  }, [visible, deal]);

  const handleFieldChange = useCallback((field: string, value: unknown) => {
    setFormData((prev) => {
      const newData = { ...prev };
      const fields = field.split('.');
      
      if (fields.length === 1) {
        (newData as Record<string, unknown>)[fields[0]] = value;
      } else if (fields.length === 2) {
        const [parent, child] = fields;
        if (parent === 'targetCompany') {
          newData.targetCompany = { ...newData.targetCompany, [child]: value };
        }
      }
      
      return newData;
    });
    setValidationErrors([]);
  }, []);

  const handlePartyChange = useCallback((index: number, field: keyof DealParty, value: string) => {
    setFormData((prev) => {
      const parties = [...prev.parties];
      parties[index] = { ...parties[index], [field]: value };
      return { ...prev, parties };
    });
    setValidationErrors([]);
  }, []);

  const handleAddParty = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      parties: [...prev.parties, { ...initialParty }],
    }));
  }, []);

  const handleRemoveParty = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      parties: prev.parties.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    // Client-side validation
    const errors: string[] = [];
    
    if (!formData.name?.trim()) {
      errors.push('Deal name is required');
    }
    if (!formData.parties?.length) {
      errors.push('At least one party is required');
    }
    formData.parties?.forEach((party, index) => {
      if (!party.name?.trim()) {
        errors.push(`Party ${index + 1}: name is required`);
      }
    });
    if (!formData.transactionType) {
      errors.push('Transaction type is required');
    }
    if (!formData.targetCompany?.name?.trim()) {
      errors.push('Target company name is required');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Server-side validation if available
    if (validateInput) {
      const validation = await validateInput(formData);
      if (!validation.valid) {
        setValidationErrors(validation.errors);
        return;
      }
    }

    onSubmit(formData);
  }, [formData, onSubmit, validateInput]);

  const isEditing = !!deal;

  return (
    <Modal
      title={isEditing ? 'Edit Deal' : 'Create New Deal'}
      visible={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      okText={isEditing ? 'Save Changes' : 'Create Deal'}
      cancelText="Cancel"
      confirmLoading={loading}
      autoFocus={false}
      focusLock
      style={{ width: 600 }}
    >
      <div className={styles.container}>
        {validationErrors.length > 0 && (
          <div className={styles.validationErrors}>
            {validationErrors.map((error, index) => (
              <div key={index} className={styles.validationError}>
                {error}
              </div>
            ))}
          </div>
        )}

        <Form className={styles.form} layout="vertical">
          <div className={styles.formGroup}>
            <span className={styles.label}>
              Deal Name <span className={styles.required}>*</span>
            </span>
            <Input
              value={formData.name}
              onChange={(value) => handleFieldChange('name', value)}
              placeholder="e.g., Project Alpha Acquisition"
              allowClear
            />
          </div>

          <div className={styles.formGroup}>
            <span className={styles.label}>
              Transaction Type <span className={styles.required}>*</span>
            </span>
            <Select
              value={formData.transactionType}
              onChange={(value) => handleFieldChange('transactionType', value)}
              placeholder="Select transaction type"
              options={TRANSACTION_TYPES}
            />
          </div>

          <div className={styles.formGroup}>
            <span className={styles.label}>
              Target Company <span className={styles.required}>*</span>
            </span>
            <Input
              value={formData.targetCompany?.name}
              onChange={(value) => handleFieldChange('targetCompany.name', value)}
              placeholder="Company name"
              allowClear
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <span className={styles.label}>Industry</span>
              <Input
                value={formData.targetCompany?.industry}
                onChange={(value) => handleFieldChange('targetCompany.industry', value)}
                placeholder="e.g., Technology"
                allowClear
              />
            </div>
            <div className={styles.formGroup}>
              <span className={styles.label}>Jurisdiction</span>
              <Input
                value={formData.targetCompany?.jurisdiction}
                onChange={(value) => handleFieldChange('targetCompany.jurisdiction', value)}
                placeholder="e.g., Delaware, USA"
                allowClear
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <span className={styles.label}>
              Parties <span className={styles.required}>*</span>
            </span>
            <div className={styles.partiesSection}>
              {formData.parties?.map((party, index) => (
                <div key={index} className={styles.partyItem}>
                  <Input
                    className={styles.partyName}
                    value={party.name}
                    onChange={(value) => handlePartyChange(index, 'name', value)}
                    placeholder="Party name"
                    allowClear
                  />
                  <Select
                    className={styles.partyRole}
                    value={party.role}
                    onChange={(value) => handlePartyChange(index, 'role', value)}
                    options={PARTY_ROLES}
                  />
                  {formData.parties.length > 1 && (
                    <Button
                      type="text"
                      icon={<IconClose />}
                      onClick={() => handleRemoveParty(index)}
                      className={styles.removePartyButton}
                    />
                  )}
                </div>
              ))}
              <Button
                type="secondary"
                icon={<IconAdd />}
                onClick={handleAddParty}
                className={styles.addPartyButton}
              >
                Add Party
              </Button>
            </div>
          </div>
        </Form>
      </div>
    </Modal>
  );
}

export default DealForm;