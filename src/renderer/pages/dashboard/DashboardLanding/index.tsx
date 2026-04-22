/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Card, Typography, Empty } from '@arco-design/web-react';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

const DashboardLanding: React.FC = () => {
  const { t } = useTranslation('dashboard');

  return (
    <div className='p-24px'>
      <Title heading={3} className='mb-24px'>
        {t('landing.title')}
      </Title>
      <Card>
        <Empty description={t('landing.empty')} />
      </Card>
      <Text className='mt-16px block'>{t('landing.description')}</Text>
    </div>
  );
};

export default DashboardLanding;
