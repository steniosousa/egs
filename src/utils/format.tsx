
export function formatarCpfCnpj(input: string, path: string): string {
  let value = input.replace(/\D/g, '');

  if (value.length > 14) {
    value = value.substring(0, 14);
  }

  let formattedValue = '';

  if (value.length <= 11) {
    if (value.length <= 3) {
      formattedValue = value;
    } else if (value.length <= 6) {
      formattedValue = value.replace(/(\d{3})(\d{0,3})/, '$1.$2');
    } else if (value.length <= 9) {
      formattedValue = value.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
    } else {
      formattedValue = value.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
    }
  } else {
    if (value.length <= 2) {
      formattedValue = value;
    } else if (value.length <= 5) {
      formattedValue = value.replace(/(\d{2})(\d{0,3})/, '$1.$2');
    } else if (value.length <= 8) {
      formattedValue = value.replace(/(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
    } else if (value.length <= 12) {
      formattedValue = value.replace(/(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
    } else {
      formattedValue = value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
    }
  }


  return formattedValue
}