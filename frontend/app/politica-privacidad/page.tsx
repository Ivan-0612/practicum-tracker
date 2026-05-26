"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, ExternalLink, Mail, MapPin, Shield } from "lucide-react";

export default function PoliticaPrivacidadPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B1120] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">

        {/* Botón volver */}
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 text-gray-500 dark:text-gray-400 hover:text-ufv-azul dark:hover:text-ufv-azul font-bold flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>

        {/* Tarjeta principal */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 md:p-10 space-y-8">

          {/* Cabecera */}
          <div className="flex items-center gap-4 border-b border-gray-100 dark:border-gray-700 pb-6">
            <Image src="/logo-ufv.png" alt="Logo UFV" width={52} height={52} className="object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-ufv-azul" />
                <h1 className="text-2xl font-black text-ufv-azul-oscuro dark:text-white">Política de Privacidad</h1>
              </div>
              <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
                Practicum Tracker · Universidad Francisco de Vitoria
              </p>
            </div>
          </div>

          {/* ── Responsable ── */}
          <section>
            <h2 className="text-base font-black text-ufv-azul-oscuro dark:text-gray-200 uppercase tracking-wide mb-3">
              Responsable del tratamiento
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              El responsable del tratamiento de sus datos es la{" "}
              <strong className="text-gray-800 dark:text-gray-200">Universidad Francisco de Vitoria (UFV)</strong>, con domicilio en
              Crta. M-515 Pozuelo-Majadahonda Km. 1.800, 28223 Pozuelo de Alarcón (Madrid).
            </p>
          </section>

          {/* ── Finalidad ── */}
          <section>
            <h2 className="text-base font-black text-ufv-azul-oscuro dark:text-gray-200 uppercase tracking-wide mb-3">
              Finalidad del tratamiento
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              La finalidad del tratamiento es observar el impacto de las metodologías docentes en el aprendizaje de
              los alumnos de la UFV y gestionar su participación en esta plataforma, lo cual puede suponer un
              perfilado de sus aptitudes{" "}
              <span className="text-gray-500">(el cual no produce efectos jurídicos)</span>, así como la remisión,
              por cualquier medio, incluidos los electrónicos —a modo enunciativo, pero no limitativo, Aula Virtual
              y correo electrónico—, de comunicados informándole sobre el estado de la misma.
            </p>
          </section>

          {/* ── Legitimación ── */}
          <section>
            <h2 className="text-base font-black text-ufv-azul-oscuro dark:text-gray-200 uppercase tracking-wide mb-3">
              Legitimación
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              La legitimación del tratamiento es el <strong className="text-gray-800 dark:text-gray-200">consentimiento del
              interesado</strong> marcando las casillas destinadas a tal efecto en el proceso de registro.
            </p>
          </section>

          {/* ── Comunicación ── */}
          <section>
            <h2 className="text-base font-black text-ufv-azul-oscuro dark:text-gray-200 uppercase tracking-wide mb-3">
              Comunicación de datos
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Sus datos personales no serán comunicados a terceros, salvo a prestadores de servicio con acceso a
              datos que actúan como encargados del tratamiento bajo las garantías exigidas por el Reglamento (UE)
              2016/679 (RGPD).
            </p>
          </section>

          {/* ── Conservación ── */}
          <section>
            <h2 className="text-base font-black text-ufv-azul-oscuro dark:text-gray-200 uppercase tracking-wide mb-3">
              Plazo de conservación
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Los datos serán conservados durante <strong className="text-gray-800 dark:text-gray-200">cinco años</strong> y, una vez
              finalizado dicho plazo, los datos podrán anonimizarse debido al interés científico del estudio.
            </p>
          </section>

          {/* ── Derechos ── */}
          <section>
            <h2 className="text-base font-black text-ufv-azul-oscuro dark:text-gray-200 uppercase tracking-wide mb-3">
              Derechos del interesado
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              Puede ejercitar sus derechos de <strong className="text-gray-800 dark:text-gray-200">acceso, rectificación,
              supresión, oposición, limitación del tratamiento y portabilidad</strong> mediante:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-gray-50 dark:bg-[#0B1120] border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                <MapPin className="w-4 h-4 text-ufv-azul mt-0.5 shrink-0" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Escrito dirigido a la <strong className="text-gray-800 dark:text-gray-200">Secretaría General de la
                  Universidad Francisco de Vitoria</strong>, Ctra. M-515 Pozuelo-Majadahonda Km. 1.800;
                  28223, Pozuelo de Alarcón (Madrid).
                </p>
              </div>
              <div className="flex items-start gap-3 bg-gray-50 dark:bg-[#0B1120] border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                <Mail className="w-4 h-4 text-ufv-azul mt-0.5 shrink-0" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Correo electrónico:{" "}
                  <a
                    href="mailto:dpd@ufv.es"
                    className="font-bold text-ufv-azul hover:text-ufv-azul-oscuro underline"
                  >
                    dpd@ufv.es
                  </a>
                </p>
              </div>
            </div>
          </section>

          {/* ── Datos de terceros ── */}
          <section>
            <h2 className="text-base font-black text-ufv-azul-oscuro dark:text-gray-200 uppercase tracking-wide mb-3">
              Datos de terceras personas
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              Si en algún momento nos facilita datos de terceras personas, le informamos de que queda obligado a
              informar al interesado sobre el contenido de esta cláusula.
            </p>
          </section>

          {/* ── Más información ── */}
          <section className="border-t border-gray-100 dark:border-gray-700 pt-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Puede consultar la información ampliada en:{" "}
              <a
                href="https://www.ufv.es/politica-de-privacidad"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-bold text-ufv-azul hover:text-ufv-azul-oscuro underline"
              >
                www.ufv.es/politica-de-privacidad
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
