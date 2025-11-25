import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, PawPrint, Clock, CheckCircle2, Video, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const VetDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLinking, setIsLinking] = useState(false);

  // Verificar si ya tiene token
  const { data: hasGoogleToken, refetch: refetchTokenStatus } = useQuery({
    queryKey: ['has-google-token', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('google_refresh_token')
        .eq('id', user?.id)
        .single();
      
      if (error) return false;
      return !!(data as any)?.google_refresh_token;
    },
    enabled: !!user?.id
  });

  // Manejar el retorno de Google OAuth
  useEffect(() => {
    const code = searchParams.get('code');
    if (code && user && !isLinking) {
      const handleOAuthCode = async () => {
        setIsLinking(true);
        try {
          // Obtener el token de sesión actual
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            throw new Error('No hay sesión activa');
          }

          // Usar fetch directo para enviar el header Authorization
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          
          const response = await fetch(`${supabaseUrl}/functions/v1/oauth-google`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': supabaseAnonKey
            },
            body: JSON.stringify({
              code,
              redirect_uri: window.location.origin + '/vet/dashboard'
            })
          });

          const result = await response.json();
          console.log('Respuesta completa de oauth-google:', result);

          if (!response.ok) {
            console.error('Error en oauth-google:', result);
            // Limpiar el código incluso si falla para evitar reintentos
            setSearchParams({});
            throw new Error(result.error || result.details || 'Error desconocido');
          }

          toast.success('Google Calendar vinculado correctamente');
          // Limpiar el código de la URL
          setSearchParams({});
          refetchTokenStatus();
        } catch (error: any) {
          console.error('Error vinculando Google:', error);
          toast.error('Error al vincular Google Calendar: ' + (error.message || 'Error desconocido'));
        } finally {
          setIsLinking(false);
        }
      };

      handleOAuthCode();
    }
  }, [searchParams, user, isLinking, setSearchParams, refetchTokenStatus]);

  const handleLinkGoogle = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      toast.error('Falta configuración: VITE_GOOGLE_CLIENT_ID');
      return;
    }

    const redirectUri = window.location.origin + '/vet/dashboard';
    
    console.log('Redirect URI siendo enviado a Google:', redirectUri);
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent'
    });
    
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  // Citas de hoy
  const { data: todayAppointments } = useQuery({
    queryKey: ['vet-today-appointments', user?.id],
    queryFn: async () => {
      const today = startOfDay(new Date());
      const tomorrow = endOfDay(new Date());

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          pets (name, species),
          profiles!appointments_client_id_fkey (full_name)
        `)
        .eq('vet_id', user?.id)
        .gte('scheduled_for', today.toISOString())
        .lte('scheduled_for', tomorrow.toISOString())
        .in('status', ['pendiente', 'confirmada'])
        .order('scheduled_for');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Citas pendientes
  const { data: pendingCount } = useQuery({
    queryKey: ['vet-pending-count', user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('vet_id', user?.id)
        .eq('status', 'pendiente');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id
  });

  // Citas completadas última semana
  const { data: completedCount } = useQuery({
    queryKey: ['vet-completed-count', user?.id],
    queryFn: async () => {
      const weekAgo = subDays(new Date(), 7);

      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('vet_id', user?.id)
        .eq('status', 'completada')
        .gte('scheduled_for', weekAgo.toISOString());

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id
  });

  // Próximas citas confirmadas
  const { data: upcomingAppointments } = useQuery({
    queryKey: ['vet-upcoming', user?.id],
    queryFn: async () => {
      const now = new Date();

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          pets (name, species),
          profiles!appointments_client_id_fkey (full_name)
        `)
        .eq('vet_id', user?.id)
        .eq('status', 'confirmada')
        .gt('scheduled_for', now.toISOString())
        .order('scheduled_for')
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Pacientes recientes (últimas entradas clínicas)
  const { data: recentPatients } = useQuery({
    queryKey: ['vet-recent-patients', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinical_entries')
        .select(`
          visit_date,
          clinical_records!inner (
            pets!inner (
              name,
              species,
              owner_id,
              profiles!pets_owner_id_fkey (full_name)
            )
          )
        `)
        .eq('vet_id', user?.id)
        .order('visit_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Panel de Veterinario</h1>
            <p className="text-muted-foreground mt-2">Gestiona tus citas y pacientes</p>
          </div>
          <Button 
            variant={hasGoogleToken ? "outline" : "default"}
            onClick={handleLinkGoogle}
            disabled={isLinking}
            className={hasGoogleToken ? "border-green-500 text-green-600 hover:text-green-700 hover:bg-green-50" : ""}
          >
            {hasGoogleToken ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <LinkIcon className="mr-2 h-4 w-4" />}
            {isLinking ? "Vinculando..." : hasGoogleToken ? "Google Calendar Conectado" : "Conectar Google Calendar"}
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Citas de Hoy"
            value={todayAppointments?.length || 0}
            icon={Calendar}
            description="Programadas para hoy"
          />
          <StatCard
            title="Citas Pendientes"
            value={pendingCount || 0}
            icon={Clock}
            description="Por confirmar"
          />
          <StatCard
            title="Completadas (7 días)"
            value={completedCount || 0}
            icon={CheckCircle2}
            description="Última semana"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Button onClick={() => navigate('/vet/citas')} variant="outline" className="h-20">
            <Calendar className="mr-2 h-5 w-5" />
            <span className="text-lg">Gestionar Citas</span>
          </Button>
          <Button onClick={() => navigate('/vet/pacientes')} variant="outline" className="h-20">
            <PawPrint className="mr-2 h-5 w-5" />
            <span className="text-lg">Ver Pacientes</span>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Citas de Hoy
            </CardTitle>
            <CardDescription>
              {todayAppointments?.length || 0} citas programadas para hoy
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todayAppointments && todayAppointments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Mascota</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayAppointments.map((apt) => (
                    <TableRow key={apt.id}>
                      <TableCell>
                        {apt.scheduled_for ? format(new Date(apt.scheduled_for), 'HH:mm', { locale: es }) : 'Por agendar'}
                      </TableCell>
                      <TableCell>
                        {(apt.pets as any)?.name || 'N/A'}
                        <span className="text-xs text-muted-foreground block">
                          {(apt.pets as any)?.species}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(apt.profiles as any)?.full_name || 'N/A'}
                      </TableCell>
                      <TableCell className="capitalize">
                        {apt.type === 'teleconsulta' && <Video className="inline h-4 w-4 mr-1" />}
                        {apt.type}
                      </TableCell>
                      <TableCell>
                        <Badge variant={apt.status === 'confirmada' ? 'default' : 'secondary'}>
                          {apt.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">No hay citas programadas para hoy</p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Próximas Citas Confirmadas</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments && upcomingAppointments.length > 0 ? (
                <div className="space-y-4">
                  {upcomingAppointments.map((apt) => (
                    <div key={apt.id} className="flex justify-between items-start border-b pb-3 last:border-0">
                      <div>
                        <p className="font-medium">{(apt.pets as any)?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {apt.scheduled_for && format(new Date(apt.scheduled_for), "dd/MM/yyyy HH:mm", { locale: es })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(apt.profiles as any)?.full_name}
                        </p>
                      </div>
                      <Badge className="capitalize">{apt.type}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No hay citas próximas</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pacientes Recientes</CardTitle>
              <CardDescription>Últimas consultas realizadas</CardDescription>
            </CardHeader>
            <CardContent>
              {recentPatients && recentPatients.length > 0 ? (
                <div className="space-y-4">
                  {recentPatients.map((entry: any, idx) => (
                    <div key={idx} className="flex justify-between items-start border-b pb-3 last:border-0">
                      <div>
                        <p className="font-medium">{entry.clinical_records?.pets?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {entry.clinical_records?.pets?.species}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Dueño: {entry.clinical_records?.pets?.profiles?.full_name}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(entry.visit_date), "dd/MM/yyyy", { locale: es })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No hay pacientes recientes</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VetDashboard;
