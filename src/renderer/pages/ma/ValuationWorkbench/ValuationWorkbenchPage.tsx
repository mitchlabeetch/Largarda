/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ValuationWorkbenchPage Component
 * User-facing analytical workbench for running M&A valuations using multiple methods.
 */

import React, { useState } from 'react';
import { Typography, Tabs, Card, Button, InputNumber, Select, Alert, Space } from '@arco-design/web-react';
import { useTranslation } from 'react-i18next';
import {
  runDcf,
  runMultiples,
  runAnr,
  runRuleOfThumb,
  runSensitivity,
  buildFootballField,
  benchmark,
  type DcfInputs,
  type MultiplesInputs,
  type AnrInputs,
  type RuleOfThumbInputs,
  type SensitivityOptions,
  type FootballFieldInputs,
  type DcfResult,
  type MultiplesResult,
  type AnrResult,
  type ValuationRange,
  type SensitivityResult,
  type FootballFieldResult,
} from '@/common/ma/valuation';
import { Calculator, ChartLine, Info } from '@icon-park/react';
import styles from './ValuationWorkbenchPage.module.css';

const { Title, Text } = Typography;
const TabPane = Tabs.TabPane;
const Option = Select.Option;

type ValuationTab = 'dcf' | 'multiples' | 'anr' | 'rule-of-thumb' | 'sensitivity' | 'football-field';

export function ValuationWorkbenchPage() {
  const { t } = useTranslation('ma');
  const [activeTab, setActiveTab] = useState<ValuationTab>('dcf');
  const [results, setResults] = useState<{
    dcf?: DcfResult;
    multiples?: MultiplesResult;
    anr?: AnrResult;
    ruleOfThumb?: ValuationRange;
    sensitivity?: SensitivityResult;
    footballField?: FootballFieldResult;
  }>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // DCF state
  const [dcfInputs, setDcfInputs] = useState<Partial<DcfInputs>>({
    baseFreeCashFlow: 1000000,
    growthRate: 0.05,
    projectionYears: 5,
    wacc: 0.1,
    terminalGrowthRate: 0.02,
    netDebt: 0,
  });

  // Multiples state
  const [multiplesInputs, setMultiplesInputs] = useState<Partial<MultiplesInputs>>({
    revenue: 10000000,
    ebitda: 2000000,
    netIncome: 1500000,
    netDebt: 0,
    benchmarks: [benchmark('ev_ebitda', 4, 5, 6), benchmark('ev_revenue', 1, 1.5, 2)],
  });

  // ANR state
  const [anrInputs, setAnrInputs] = useState<Partial<AnrInputs>>({
    totalAssets: 5000000,
    totalLiabilities: 2000000,
    adjustments: [100000],
  });

  // Rule of Thumb state
  const [ruleOfThumbInputs, setRuleOfThumbInputs] = useState<Partial<RuleOfThumbInputs>>({
    sector: 'pharmacie',
    revenue: 5000000,
    ebitda: 800000,
    netDebt: 0,
  });

  // Sensitivity state
  const [sensitivityOptions, setSensitivityOptions] = useState<Partial<SensitivityOptions>>({
    axis: 'wacc',
    values: [],
  });

  const runDcfValuation = () => {
    try {
      const inputs: DcfInputs = {
        baseFreeCashFlow: dcfInputs.baseFreeCashFlow ?? 0,
        growthRate: dcfInputs.growthRate ?? 0,
        projectionYears: dcfInputs.projectionYears ?? 5,
        wacc: dcfInputs.wacc ?? 0.1,
        terminalGrowthRate: dcfInputs.terminalGrowthRate ?? 0.02,
        netDebt: dcfInputs.netDebt,
      };
      const result = runDcf(inputs);
      setResults((prev) => ({ ...prev, dcf: result }));
      setErrors((prev) => ({ ...prev, dcf: '' }));
    } catch (error) {
      setErrors((prev) => ({ ...prev, dcf: error instanceof Error ? error.message : 'Unknown error' }));
    }
  };

  const runMultiplesValuation = () => {
    try {
      const inputs: MultiplesInputs = {
        revenue: multiplesInputs.revenue,
        ebitda: multiplesInputs.ebitda,
        netIncome: multiplesInputs.netIncome,
        netDebt: multiplesInputs.netDebt,
        benchmarks: multiplesInputs.benchmarks ?? [],
      };
      const result = runMultiples(inputs);
      setResults((prev) => ({ ...prev, multiples: result }));
      setErrors((prev) => ({ ...prev, multiples: '' }));
    } catch (error) {
      setErrors((prev) => ({ ...prev, multiples: error instanceof Error ? error.message : 'Unknown error' }));
    }
  };

  const runAnrValuation = () => {
    try {
      const inputs: AnrInputs = {
        totalAssets: anrInputs.totalAssets ?? 0,
        totalLiabilities: anrInputs.totalLiabilities ?? 0,
        adjustments: anrInputs.adjustments,
      };
      const result = runAnr(inputs);
      setResults((prev) => ({ ...prev, anr: result }));
      setErrors((prev) => ({ ...prev, anr: '' }));
    } catch (error) {
      setErrors((prev) => ({ ...prev, anr: error instanceof Error ? error.message : 'Unknown error' }));
    }
  };

  const runRuleOfThumbValuation = () => {
    try {
      const inputs: RuleOfThumbInputs = {
        sector: ruleOfThumbInputs.sector ?? 'pharmacie',
        revenue: ruleOfThumbInputs.revenue,
        ebitda: ruleOfThumbInputs.ebitda,
        grossMargin: ruleOfThumbInputs.grossMargin,
        netDebt: ruleOfThumbInputs.netDebt,
      };
      const result = runRuleOfThumb(inputs);
      setResults((prev) => ({ ...prev, ruleOfThumb: result }));
      setErrors((prev) => ({ ...prev, ruleOfThumb: '' }));
    } catch (error) {
      setErrors((prev) => ({ ...prev, ruleOfThumb: error instanceof Error ? error.message : 'Unknown error' }));
    }
  };

  const runSensitivityAnalysis = () => {
    try {
      const base: DcfInputs = {
        baseFreeCashFlow: dcfInputs.baseFreeCashFlow ?? 0,
        growthRate: dcfInputs.growthRate ?? 0,
        projectionYears: dcfInputs.projectionYears ?? 5,
        wacc: dcfInputs.wacc ?? 0.1,
        terminalGrowthRate: dcfInputs.terminalGrowthRate ?? 0.02,
        netDebt: dcfInputs.netDebt,
      };
      const options: SensitivityOptions = {
        axis: sensitivityOptions.axis ?? 'wacc',
        values: sensitivityOptions.values ?? [],
      };
      const result = runSensitivity(base, options);
      setResults((prev) => ({ ...prev, sensitivity: result }));
      setErrors((prev) => ({ ...prev, sensitivity: '' }));
    } catch (error) {
      setErrors((prev) => ({ ...prev, sensitivity: error instanceof Error ? error.message : 'Unknown error' }));
    }
  };

  const runFootballField = () => {
    try {
      const ranges = [];
      if (results.dcf) {
        ranges.push({
          method: 'dcf' as const,
          low: results.dcf.equityValue * 0.9,
          central: results.dcf.equityValue,
          high: results.dcf.equityValue * 1.1,
          currency: 'EUR',
        });
      }
      if (results.multiples) {
        ranges.push(results.multiples.aggregate);
      }
      if (ranges.length === 0) {
        setErrors((prev) => ({ ...prev, footballField: 'Run at least one valuation method first' }));
        return;
      }
      const inputs: FootballFieldInputs = { ranges };
      const result = buildFootballField(inputs);
      setResults((prev) => ({ ...prev, footballField: result }));
      setErrors((prev) => ({ ...prev, footballField: '' }));
    } catch (error) {
      setErrors((prev) => ({ ...prev, footballField: error instanceof Error ? error.message : 'Unknown error' }));
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Title heading={3}>{t('valuation.title') || 'Valuation Workbench'}</Title>
        <Text type='secondary'>
          {t('valuation.description') || 'Analyze company value using multiple valuation methods'}
        </Text>
      </header>

      <Tabs activeTab={activeTab} onChange={(key) => setActiveTab(key as ValuationTab)} className={styles.tabs}>
        <TabPane
          key='dcf'
          title={
            <span className={styles.tabTitle}>
              <Calculator size={16} />
              {t('valuation.methods.dcf')}
            </span>
          }
        >
          <Card className={styles.card}>
            <div className={styles.assumptionsSection}>
              <Title heading={4}>{t('valuation.assumptions') || 'Assumptions'}</Title>
              <Space direction='vertical' size='large' className={styles.form}>
                <div className={styles.formItem}>
                  <label>{t('valuation.fields.baseFreeCashFlow')}</label>
                  <InputNumber
                    value={dcfInputs.baseFreeCashFlow}
                    onChange={(value) =>
                      setDcfInputs((prev: Partial<DcfInputs>) => ({ ...prev, baseFreeCashFlow: value ?? 0 }))
                    }
                    placeholder='Base free cash flow'
                    className={styles.input}
                  />
                </div>
                <div className={styles.formItem}>
                  <label>{t('valuation.fields.growthRate')}</label>
                  <InputNumber
                    value={dcfInputs.growthRate}
                    onChange={(value) =>
                      setDcfInputs((prev: Partial<DcfInputs>) => ({ ...prev, growthRate: value ?? 0 }))
                    }
                    placeholder='Growth rate (decimal)'
                    step={0.01}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formItem}>
                  <label>{t('valuation.fields.projectionYears')}</label>
                  <InputNumber
                    value={dcfInputs.projectionYears}
                    onChange={(value: number | null) =>
                      setDcfInputs((prev: Partial<DcfInputs>) => ({ ...prev, projectionYears: value ?? 5 }))
                    }
                    placeholder='Projection years'
                    min={1}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formItem}>
                  <label>{t('valuation.fields.wacc')}</label>
                  <InputNumber
                    value={dcfInputs.wacc}
                    onChange={(value) => setDcfInputs((prev: Partial<DcfInputs>) => ({ ...prev, wacc: value ?? 0.1 }))}
                    placeholder='WACC (decimal)'
                    step={0.01}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formItem}>
                  <label>{t('valuation.fields.terminalGrowthRate')}</label>
                  <InputNumber
                    value={dcfInputs.terminalGrowthRate}
                    onChange={(value: number | null) =>
                      setDcfInputs((prev: Partial<DcfInputs>) => ({ ...prev, terminalGrowthRate: value ?? 0.02 }))
                    }
                    placeholder='Terminal growth rate (decimal)'
                    step={0.01}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formItem}>
                  <label>{t('valuation.fields.netDebt')}</label>
                  <InputNumber
                    value={dcfInputs.netDebt}
                    onChange={(value) => setDcfInputs((prev: Partial<DcfInputs>) => ({ ...prev, netDebt: value ?? 0 }))}
                    placeholder='Net debt'
                    className={styles.input}
                  />
                </div>
                <Button type='primary' onClick={runDcfValuation}>
                  {t('valuation.run') || 'Run Valuation'}
                </Button>
              </Space>
            </div>

            {errors.dcf && <Alert type='error' content={errors.dcf} className={styles.error} />}

            {results.dcf && (
              <div className={styles.outputSection}>
                <Title heading={4}>{t('valuation.results.title') || 'Results'}</Title>
                <div className={styles.resultGrid}>
                  <div className={styles.resultItem}>
                    <Text type='secondary'>{t('valuation.results.enterpriseValue')}</Text>
                    <Text style={{ fontWeight: 600 }}>{results.dcf.enterpriseValue.toLocaleString()} €</Text>
                  </div>
                  <div className={styles.resultItem}>
                    <Text type='secondary'>{t('valuation.results.equityValue')}</Text>
                    <Text style={{ fontWeight: 600 }}>{results.dcf.equityValue.toLocaleString()} €</Text>
                  </div>
                  <div className={styles.resultItem}>
                    <Text type='secondary'>{t('valuation.results.terminalValue')}</Text>
                    <Text style={{ fontWeight: 600 }}>{results.dcf.terminalValue.toLocaleString()} €</Text>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabPane>

        <TabPane
          key='multiples'
          title={
            <span className={styles.tabTitle}>
              <ChartLine size={16} />
              {t('valuation.methods.multiples')}
            </span>
          }
        >
          <Card className={styles.card}>
            <div className={styles.assumptionsSection}>
              <Title heading={4}>{t('valuation.assumptions') || 'Assumptions'}</Title>
              <Space direction='vertical' size='large' className={styles.form}>
                <div className={styles.formItem}>
                  <label>{t('valuation.fields.revenue')}</label>
                  <InputNumber
                    value={multiplesInputs.revenue}
                    onChange={(value) =>
                      setMultiplesInputs((prev: Partial<MultiplesInputs>) => ({ ...prev, revenue: value ?? 0 }))
                    }
                    placeholder='Revenue'
                    className={styles.input}
                  />
                </div>
                <div className={styles.formItem}>
                  <label>{t('valuation.fields.ebitda')}</label>
                  <InputNumber
                    value={multiplesInputs.ebitda}
                    onChange={(value) =>
                      setMultiplesInputs((prev: Partial<MultiplesInputs>) => ({ ...prev, ebitda: value ?? 0 }))
                    }
                    placeholder='EBITDA'
                    className={styles.input}
                  />
                </div>
                <div className={styles.formItem}>
                  <label>{t('valuation.fields.netIncome')}</label>
                  <InputNumber
                    value={multiplesInputs.netIncome}
                    onChange={(value) =>
                      setMultiplesInputs((prev: Partial<MultiplesInputs>) => ({ ...prev, netIncome: value ?? 0 }))
                    }
                    placeholder='Net income'
                    className={styles.input}
                  />
                </div>
                <div className={styles.formItem}>
                  <label>{t('valuation.fields.netDebt')}</label>
                  <InputNumber
                    value={multiplesInputs.netDebt}
                    onChange={(value) =>
                      setMultiplesInputs((prev: Partial<MultiplesInputs>) => ({ ...prev, netDebt: value ?? 0 }))
                    }
                    placeholder='Net debt'
                    className={styles.input}
                  />
                </div>
                <Button type='primary' onClick={runMultiplesValuation}>
                  {t('valuation.run') || 'Run Valuation'}
                </Button>
              </Space>
            </div>

            {errors.multiples && <Alert type='error' content={errors.multiples} className={styles.error} />}

            {results.multiples && (
              <div className={styles.outputSection}>
                <Title heading={4}>{t('valuation.results.title') || 'Results'}</Title>
                <div className={styles.resultGrid}>
                  <div className={styles.resultItem}>
                    <Text type='secondary'>{t('valuation.results.range')}</Text>
                    <Text style={{ fontWeight: 600 }}>
                      {results.multiples.aggregate.low.toLocaleString()} -{' '}
                      {results.multiples.aggregate.high.toLocaleString()} €
                    </Text>
                  </div>
                  <div className={styles.resultItem}>
                    <Text type='secondary'>{t('valuation.results.central')}</Text>
                    <Text style={{ fontWeight: 600 }}>{results.multiples.aggregate.central.toLocaleString()} €</Text>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabPane>

        <TabPane
          key='anr'
          title={
            <span className={styles.tabTitle}>
              <Calculator size={16} />
              {t('valuation.methods.anr')}
            </span>
          }
        >
          <Card className={styles.card}>
            <div className={styles.assumptionsSection}>
              <Title heading={4}>{t('valuation.assumptions') || 'Assumptions'}</Title>
              <Space direction='vertical' size='large' className={styles.form}>
                <div className={styles.formItem}>
                  <label>{t('valuation.fields.totalAssets')}</label>
                  <InputNumber
                    value={anrInputs.totalAssets}
                    onChange={(value: number | null) =>
                      setAnrInputs((prev: Partial<AnrInputs>) => ({ ...prev, totalAssets: value ?? 0 }))
                    }
                    placeholder='Total assets'
                    className={styles.input}
                  />
                </div>
                <div className={styles.formItem}>
                  <label>{t('valuation.fields.totalLiabilities')}</label>
                  <InputNumber
                    value={anrInputs.totalLiabilities}
                    onChange={(value: number | null) =>
                      setAnrInputs((prev: Partial<AnrInputs>) => ({ ...prev, totalLiabilities: value ?? 0 }))
                    }
                    placeholder='Total liabilities'
                    className={styles.input}
                  />
                </div>
                <Button type='primary' onClick={runAnrValuation}>
                  {t('valuation.run') || 'Run Valuation'}
                </Button>
              </Space>
            </div>

            {errors.anr && <Alert type='error' content={errors.anr} className={styles.error} />}

            {results.anr && (
              <div className={styles.outputSection}>
                <Title heading={4}>{t('valuation.results.title') || 'Results'}</Title>
                <div className={styles.resultGrid}>
                  <div className={styles.resultItem}>
                    <Text type='secondary'>Book Equity</Text>
                    <Text style={{ fontWeight: 600 }}>{results.anr.bookEquity.toLocaleString()} €</Text>
                  </div>
                  <div className={styles.resultItem}>
                    <Text type='secondary'>Revalued Equity</Text>
                    <Text style={{ fontWeight: 600 }}>{results.anr.revaluedEquity.toLocaleString()} €</Text>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabPane>

        <TabPane
          key='rule-of-thumb'
          title={
            <span className={styles.tabTitle}>
              <Info size={16} />
              {t('valuation.methods.ruleOfThumb')}
            </span>
          }
        >
          <Card className={styles.card}>
            <div className={styles.assumptionsSection}>
              <Title heading={4}>{t('valuation.assumptions') || 'Assumptions'}</Title>
              <Space direction='vertical' size='large' className={styles.form}>
                <div className={styles.formItem}>
                  <label>Sector</label>
                  <Select
                    value={ruleOfThumbInputs.sector}
                    onChange={(value) =>
                      setRuleOfThumbInputs((prev: Partial<RuleOfThumbInputs>) => ({ ...prev, sector: value }))
                    }
                    className={styles.input}
                  >
                    <Option value='pharmacie'>Pharmacie</Option>
                    <Option value='restaurant'>Restaurant</Option>
                    <Option value='boulangerie'>Boulangerie</Option>
                    <Option value='cabinet_expertise_comptable'>Cabinet Expertise Comptable</Option>
                    <Option value='agence_immobiliere'>Agence Immobilière</Option>
                    <Option value='salon_coiffure'>Salon Coiffure</Option>
                    <Option value='ecommerce'>E-commerce</Option>
                    <Option value='saas'>SaaS</Option>
                  </Select>
                </div>
                <div className={styles.formItem}>
                  <label>{t('valuation.fields.revenue')}</label>
                  <InputNumber
                    value={ruleOfThumbInputs.revenue}
                    onChange={(value) =>
                      setRuleOfThumbInputs((prev: Partial<RuleOfThumbInputs>) => ({ ...prev, revenue: value ?? 0 }))
                    }
                    placeholder='Revenue'
                    className={styles.input}
                  />
                </div>
                <div className={styles.formItem}>
                  <label>{t('valuation.fields.ebitda')}</label>
                  <InputNumber
                    value={ruleOfThumbInputs.ebitda}
                    onChange={(value) =>
                      setRuleOfThumbInputs((prev: Partial<RuleOfThumbInputs>) => ({ ...prev, ebitda: value ?? 0 }))
                    }
                    placeholder='EBITDA'
                    className={styles.input}
                  />
                </div>
                <div className={styles.formItem}>
                  <label>{t('valuation.fields.netDebt')}</label>
                  <InputNumber
                    value={ruleOfThumbInputs.netDebt}
                    onChange={(value) =>
                      setRuleOfThumbInputs((prev: Partial<RuleOfThumbInputs>) => ({ ...prev, netDebt: value ?? 0 }))
                    }
                    placeholder='Net debt'
                    className={styles.input}
                  />
                </div>
                <Button type='primary' onClick={runRuleOfThumbValuation}>
                  {t('valuation.run') || 'Run Valuation'}
                </Button>
              </Space>
            </div>

            {errors.ruleOfThumb && <Alert type='error' content={errors.ruleOfThumb} className={styles.error} />}

            {results.ruleOfThumb && (
              <div className={styles.outputSection}>
                <Title heading={4}>{t('valuation.results.title') || 'Results'}</Title>
                <div className={styles.resultGrid}>
                  <div className={styles.resultItem}>
                    <Text type='secondary'>Low</Text>
                    <Text style={{ fontWeight: 600 }}>{results.ruleOfThumb.low.toLocaleString()} €</Text>
                  </div>
                  <div className={styles.resultItem}>
                    <Text type='secondary'>Central</Text>
                    <Text style={{ fontWeight: 600 }}>{results.ruleOfThumb.central.toLocaleString()} €</Text>
                  </div>
                  <div className={styles.resultItem}>
                    <Text type='secondary'>High</Text>
                    <Text style={{ fontWeight: 600 }}>{results.ruleOfThumb.high.toLocaleString()} €</Text>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabPane>

        <TabPane
          key='sensitivity'
          title={
            <span className={styles.tabTitle}>
              <ChartLine size={16} />
              {t('valuation.sensitivity.title')}
            </span>
          }
        >
          <Card className={styles.card}>
            <div className={styles.assumptionsSection}>
              <Title heading={4}>{t('valuation.assumptions') || 'Assumptions'}</Title>
              <Space direction='vertical' size='large' className={styles.form}>
                <div className={styles.formItem}>
                  <label>{t('valuation.sensitivity.axis')}</label>
                  <Select
                    value={sensitivityOptions.axis}
                    onChange={(value) =>
                      setSensitivityOptions((prev: Partial<SensitivityOptions>) => ({ ...prev, axis: value }))
                    }
                    className={styles.input}
                  >
                    <Option value='wacc'>{t('valuation.sensitivity.wacc')}</Option>
                    <Option value='growthRate'>{t('valuation.sensitivity.growthRate')}</Option>
                    <Option value='terminalGrowthRate'>{t('valuation.sensitivity.terminalGrowthRate')}</Option>
                  </Select>
                </div>
                <div className={styles.formItem}>
                  <label>Variation</label>
                  <InputNumber
                    value={sensitivityOptions.values?.length ?? 0}
                    onChange={(value) =>
                      setSensitivityOptions((prev: Partial<SensitivityOptions>) => ({
                        ...prev,
                        values: prev.values,
                      }))
                    }
                    placeholder='Number of values'
                    min={1}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formItem}>
                  <label>Steps</label>
                  <InputNumber
                    value={sensitivityOptions.axis === 'wacc' ? 0.1 : sensitivityOptions.axis === 'growthRate' ? 0.05 : 0.02}
                    disabled
                    placeholder='Base value'
                    className={styles.input}
                  />
                </div>
                <Button type='primary' onClick={runSensitivityAnalysis}>
                  {t('valuation.run') || 'Run Analysis'}
                </Button>
              </Space>
            </div>

            {errors.sensitivity && <Alert type='error' content={errors.sensitivity} className={styles.error} />}

            {results.sensitivity && (
              <div className={styles.outputSection}>
                <Title heading={4}>{t('valuation.results.title') || 'Results'}</Title>
                <div className={styles.resultGrid}>
                  <div className={styles.resultItem}>
                    <Text type='secondary'>Min</Text>
                    <Text style={{ fontWeight: 600 }}>{results.sensitivity.min.toLocaleString()} €</Text>
                  </div>
                  <div className={styles.resultItem}>
                    <Text type='secondary'>Max</Text>
                    <Text style={{ fontWeight: 600 }}>{results.sensitivity.max.toLocaleString()} €</Text>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabPane>

        <TabPane
          key='football-field'
          title={
            <span className={styles.tabTitle}>
              <ChartLine size={16} />
              {t('valuation.footballField.title')}
            </span>
          }
        >
          <Card className={styles.card}>
            <div className={styles.assumptionsSection}>
              <Title heading={4}>{t('valuation.footballField.title')}</Title>
              <Alert
                type='info'
                content={
                  t('valuation.footballField.empty') ||
                  'Run DCF and/or Multiples valuations first to generate the football field.'
                }
                className={styles.info}
              />
              <Button type='primary' onClick={runFootballField}>
                {t('valuation.run') || 'Generate Football Field'}
              </Button>
            </div>

            {errors.footballField && <Alert type='error' content={errors.footballField} className={styles.error} />}

            {results.footballField && (
              <div className={styles.outputSection}>
                <Title heading={4}>{t('valuation.results.title') || 'Results'}</Title>
                <div className={styles.resultGrid}>
                  <div className={styles.resultItem}>
                    <Text type='secondary'>{t('valuation.footballField.overall')}</Text>
                    <Text style={{ fontWeight: 600 }}>
                      {results.footballField.overall.low.toLocaleString()} -{' '}
                      {results.footballField.overall.high.toLocaleString()} €
                    </Text>
                  </div>
                  <div className={styles.resultItem}>
                    <Text type='secondary'>{t('valuation.results.central')}</Text>
                    <Text style={{ fontWeight: 600 }}>{results.footballField.overall.central.toLocaleString()} €</Text>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
}

export default ValuationWorkbenchPage;
