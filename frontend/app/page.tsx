import { redirect } from "next/navigation";

export default function Home() {
  // Como nuestra app es privada, si alguien entra a la raíz ("/") 
  // lo redirigimos automáticamente a la pantalla de login.
  redirect("/login");
}