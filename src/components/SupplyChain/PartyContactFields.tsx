import { Box, TextField } from '@mui/material';
import {
  validateSupplierContact,
  type SupplierContactErrors,
  type SupplierContactInput,
} from '../../lib/validation/supplierContact';

interface PartyContactFieldsProps {
  phone?: string;
  email?: string;
  website?: string;
  errors: SupplierContactErrors;
  onChange: (patch: Pick<SupplierContactInput, 'phone' | 'email' | 'website'>) => void;
  onErrors: (errors: SupplierContactErrors) => void;
}

export default function PartyContactFields({
  phone = '',
  email = '',
  website = '',
  errors,
  onChange,
  onErrors,
}: PartyContactFieldsProps) {
  const current = { phone, email, website };

  const changeField = (field: keyof SupplierContactInput, value: string) => {
    const next = { ...current, [field]: value };
    onChange({ [field]: value });
    if (errors[field]) {
      onErrors({ ...errors, [field]: validateSupplierContact(next)[field] });
    }
  };

  const blurField = (field: keyof SupplierContactInput) => {
    onErrors({ ...errors, [field]: validateSupplierContact(current)[field] });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <TextField
          label="电话"
          value={phone}
          onChange={e => changeField('phone', e.target.value)}
          onBlur={() => blurField('phone')}
          error={Boolean(errors.phone)}
          helperText={errors.phone || '仅数字、+、-，6 到 15 位数字'}
          fullWidth
        />
        <TextField
          label="邮箱"
          type="email"
          value={email}
          onChange={e => changeField('email', e.target.value)}
          onBlur={() => blurField('email')}
          error={Boolean(errors.email)}
          helperText={errors.email || ' '}
          fullWidth
        />
      </Box>
      <TextField
        label="网站"
        value={website}
        onChange={e => changeField('website', e.target.value)}
        onBlur={() => blurField('website')}
        error={Boolean(errors.website)}
        helperText={errors.website || '可空。http(s) 网址，或 www.example.com'}
        placeholder="https://example.com"
        fullWidth
      />
    </Box>
  );
}
