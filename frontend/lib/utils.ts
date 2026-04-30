export const validarPasswordFuerte = (password: string): { valida: boolean; msg: string } => {
  const patron = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!patron.test(password)) {
    return {
      valida: false,
      msg: "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&)"
    };
  }
  return { valida: true, msg: "" };
};
