-- Datos sintéticos persistentes para Inicio y Oportunidades.
-- Solo ejecutar en la base local bdc_os_local. No borrar al terminar la demo.
BEGIN;
SELECT set_config('app.tenant_id', '9bd99a0e-b229-4029-a09d-659eba250688', true);

INSERT INTO public.contacts (id, tenant_id, provider_contact_id, display_name, phone, preferred_language, consent_state)
VALUES
 ('d3000000-0000-4000-8000-000000000001', '9bd99a0e-b229-4029-a09d-659eba250688', 'demo-local:contact:lucia', '[DEMO LOCAL] Lucía Ramírez', '+570000000001', 'es', 'unknown'),
 ('d3000000-0000-4000-8000-000000000002', '9bd99a0e-b229-4029-a09d-659eba250688', 'demo-local:contact:mateo', '[DEMO LOCAL] Mateo Cárdenas', '+570000000002', 'es', 'unknown'),
 ('d3000000-0000-4000-8000-000000000003', '9bd99a0e-b229-4029-a09d-659eba250688', 'demo-local:contact:sofia', '[DEMO LOCAL] Sofía Pardo', '+570000000003', 'es', 'unknown'),
 ('d3000000-0000-4000-8000-000000000004', '9bd99a0e-b229-4029-a09d-659eba250688', 'demo-local:contact:diego', '[DEMO LOCAL] Diego Valencia', '+570000000004', 'es', 'unknown')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.conversations (id, tenant_id, contact_id, provider_conversation_id, channel, owner, state, last_activity, read_at)
VALUES
 ('d4000000-0000-4000-8000-000000000001', '9bd99a0e-b229-4029-a09d-659eba250688', 'd3000000-0000-4000-8000-000000000001', 'demo-local:conversation:lucia', 'whatsapp', 'Asesor Local', 'open', now() - interval '18 minutes', NULL),
 ('d4000000-0000-4000-8000-000000000002', '9bd99a0e-b229-4029-a09d-659eba250688', 'd3000000-0000-4000-8000-000000000002', 'demo-local:conversation:mateo', 'instagram', 'Asesor Local', 'open', now() - interval '42 minutes', NULL),
 ('d4000000-0000-4000-8000-000000000003', '9bd99a0e-b229-4029-a09d-659eba250688', 'd3000000-0000-4000-8000-000000000003', 'demo-local:conversation:sofia', 'messenger', 'Asesor Local', 'open', now() - interval '75 minutes', NULL),
 ('d4000000-0000-4000-8000-000000000004', '9bd99a0e-b229-4029-a09d-659eba250688', 'd3000000-0000-4000-8000-000000000004', 'demo-local:conversation:diego', 'whatsapp', 'Asesor Local', 'open', now() - interval '2 hours', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.messages (id, tenant_id, conversation_id, direction, sender_type, content, status, created_at)
VALUES
 ('d5000000-0000-4000-8000-000000000001', '9bd99a0e-b229-4029-a09d-659eba250688', 'd4000000-0000-4000-8000-000000000001', 'inbound', 'contact', 'DEMO LOCAL: ¿Tienen disponibilidad para una SUV familiar?', 'received', now() - interval '18 minutes'),
 ('d5000000-0000-4000-8000-000000000002', '9bd99a0e-b229-4029-a09d-659eba250688', 'd4000000-0000-4000-8000-000000000002', 'inbound', 'contact', 'DEMO LOCAL: Quisiera conocer las opciones de financiación.', 'received', now() - interval '42 minutes'),
 ('d5000000-0000-4000-8000-000000000003', '9bd99a0e-b229-4029-a09d-659eba250688', 'd4000000-0000-4000-8000-000000000003', 'inbound', 'contact', 'DEMO LOCAL: ¿Puedo agendar una prueba de manejo?', 'received', now() - interval '75 minutes'),
 ('d5000000-0000-4000-8000-000000000004', '9bd99a0e-b229-4029-a09d-659eba250688', 'd4000000-0000-4000-8000-000000000004', 'inbound', 'contact', 'DEMO LOCAL: Estoy comparando modelos híbridos.', 'received', now() - interval '2 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.opportunities (id, tenant_id, contact_id, title, contact_name, contact_phone, amount_cents, stage, assigned_user_id, notes, created_by_user_id)
VALUES
 ('d6000000-0000-4000-8000-000000000001', '9bd99a0e-b229-4029-a09d-659eba250688', 'd3000000-0000-4000-8000-000000000001', '[DEMO LOCAL] SUV familiar', '[DEMO LOCAL] Lucía Ramírez', '+570000000001', 128400000, 'new', 'f920d013-4feb-4606-aaa9-82d21ab74262', 'Registro sintético persistente para probar Inicio y pipeline.', 'f920d013-4feb-4606-aaa9-82d21ab74262'),
 ('d6000000-0000-4000-8000-000000000002', '9bd99a0e-b229-4029-a09d-659eba250688', 'd3000000-0000-4000-8000-000000000002', '[DEMO LOCAL] Plan de financiación', '[DEMO LOCAL] Mateo Cárdenas', '+570000000002', 86500000, 'working', 'f920d013-4feb-4606-aaa9-82d21ab74262', 'Registro sintético persistente para probar el cambio de etapa.', 'f920d013-4feb-4606-aaa9-82d21ab74262'),
 ('d6000000-0000-4000-8000-000000000003', '9bd99a0e-b229-4029-a09d-659eba250688', 'd3000000-0000-4000-8000-000000000003', '[DEMO LOCAL] Prueba de manejo', '[DEMO LOCAL] Sofía Pardo', '+570000000003', 57250000, 'closing', 'f920d013-4feb-4606-aaa9-82d21ab74262', 'Registro sintético persistente para probar cierre.', 'f920d013-4feb-4606-aaa9-82d21ab74262'),
 ('d6000000-0000-4000-8000-000000000004', '9bd99a0e-b229-4029-a09d-659eba250688', 'd3000000-0000-4000-8000-000000000004', '[DEMO LOCAL] Modelo híbrido', '[DEMO LOCAL] Diego Valencia', '+570000000004', 39100000, 'won', 'f920d013-4feb-4606-aaa9-82d21ab74262', 'Registro sintético persistente para probar oportunidades ganadas.', 'f920d013-4feb-4606-aaa9-82d21ab74262')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_audit_events (actor_user_id, actor_email, actor_name, target_tenant_id, dealer_name, category, action, outcome, summary, reference_id, entity_id)
SELECT 'f920d013-4feb-4606-aaa9-82d21ab74262', 'asesor.local@bdc-os.local', 'Asesor Local', '9bd99a0e-b229-4029-a09d-659eba250688', 'PRUEBA LOCAL BDC OS 2026-11-20', 'contacts', 'contact.demo_seeded', 'success', 'Se agregó contacto sintético persistente para demostración local.', 'demo-seed-2026-11-25', c.id::text
FROM public.contacts c WHERE c.tenant_id='9bd99a0e-b229-4029-a09d-659eba250688' AND c.provider_contact_id LIKE 'demo-local:contact:%'
AND NOT EXISTS (SELECT 1 FROM public.admin_audit_events a WHERE a.reference_id='demo-seed-2026-11-25' AND a.entity_id=c.id::text);
INSERT INTO public.admin_audit_events (actor_user_id, actor_email, actor_name, target_tenant_id, dealer_name, category, action, outcome, summary, reference_id, entity_id)
SELECT 'f920d013-4feb-4606-aaa9-82d21ab74262', 'asesor.local@bdc-os.local', 'Asesor Local', '9bd99a0e-b229-4029-a09d-659eba250688', 'PRUEBA LOCAL BDC OS 2026-11-20', 'opportunities', 'opportunity.demo_seeded', 'success', 'Se agregó oportunidad sintética persistente para demostración local.', 'demo-seed-2026-11-25', o.id::text
FROM public.opportunities o WHERE o.tenant_id='9bd99a0e-b229-4029-a09d-659eba250688' AND o.title LIKE '[DEMO LOCAL]%'
AND NOT EXISTS (SELECT 1 FROM public.admin_audit_events a WHERE a.reference_id='demo-seed-2026-11-25' AND a.entity_id=o.id::text);

COMMIT;
