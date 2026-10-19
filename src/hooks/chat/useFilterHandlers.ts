import { useCallback } from 'react';
import { useChatContext } from '@/contexts/chat/ChatContext';
import { DEFAULT_FILTER } from '@/contexts/chat/FiltersContext';
import { BaseFilter } from '@/types/core';
import { convertBaseFiltersToConversationFilters } from '@/utils/chat/filterAdapters';
import { saveConversationFilters, clearConversationFilters } from '@/utils/storage/filtersStorage';

export const useFilterHandlers = () => {
  const { conversations, filters } = useChatContext();

  const handleApplyFilters = useCallback(
    async (newFilters: BaseFilter[]) => {
      // Converter BaseFilter para ConversationFilter e aplicar
      const apiFilters = convertBaseFiltersToConversationFilters(newFilters);

      // Token taken BEFORE the request: a list load issued earlier (e.g. the
      // sidebar's mount load) can no longer overwrite this result when it lands later.
      const token = conversations.beginConversationsRequest();

      return new Promise<void>((resolve, reject) => {
        filters.applyFilters(
          apiFilters,
          (conversationsResult, pagination, query) => {
            // Atualizar o estado das conversas com os resultados do filtro
            const applied = conversations.setConversations(conversationsResult, pagination, query, token);

            // 💾 PERSISTIR: só o filtro cujo resultado entrou na lista — um filtro
            // superado por outro mais novo não pode virar o "salvo" do próximo F5.
            if (applied) {
              saveConversationFilters(newFilters);
            }
            resolve();
          },
          error => {
            // Erro - mostrar mensagem e rejeitar promise
            console.error('❌ Erro ao aplicar filtros:', error);
            reject(error);
          },
        );
      });
    },
    [filters, conversations],
  );

  const handleClearFilters = useCallback(async () => {
    try {
      // 🗑️ LIMPAR: Remover filtros salvos do localStorage
      clearConversationFilters();

      // EVO-1939: resetar o estado GLOBAL para o filtro padrão "Todas" (status=all).
      // Sem isso o badge e o matcher de realtime continuam com os filtros antigos —
      // o usuário "limpa" mas a UI não some.
      filters.setFilters([DEFAULT_FILTER]);

      // 🎯 FILTRO PADRÃO: recarregar a visão "Todas" pela MESMA via do pipeline
      // (applyFilters), mantendo activeFilters e a query em sincronia.
      const token = conversations.beginConversationsRequest();
      await filters.applyFilters(
        [DEFAULT_FILTER],
        (conversationsResult, pagination, query) => {
          conversations.setConversations(conversationsResult, pagination, query, token);
        },
        error => {
          console.error('❌ Erro ao limpar filtros:', error);
        },
      );
    } catch (error) {
      console.error('❌ Erro inesperado ao limpar filtros:', error);
    }
  }, [conversations, filters]);

  // 🔄 FUNÇÃO PARA RECARREGAR FILTROS: Reaplicar filtros atuais após mudanças
  const reloadCurrentFilters = useCallback(async () => {
    try {
      // Se há filtros ativos, reaplicar
      if (filters.state.activeFilters.length > 0) {
        const token = conversations.beginConversationsRequest();
        await filters.applyFilters(
          filters.state.activeFilters,
          (conversationsResult, pagination, query) => {
            conversations.setConversations(conversationsResult, pagination, query, token);
          },
          error => {
            console.error('❌ Erro ao recarregar filtros:', error);
          },
        );
      }
      // Se há busca ativa, reaplicar busca
      else if (filters.state.searchTerm.trim().length > 0) {
        const token = conversations.beginConversationsRequest();
        await filters.applySearch(
          filters.state.searchTerm,
          (conversationsResult, pagination, query) => {
            conversations.setConversations(conversationsResult, pagination, query, token);
          },
          error => {
            console.error('❌ Erro ao recarregar busca:', error);
          },
        );
      }
      // 🎯 FILTRO PADRÃO: Se não há filtros nem busca, recarregar a visão "Todas".
      else {
        const token = conversations.beginConversationsRequest();
        await filters.applyFilters(
          [DEFAULT_FILTER],
          (conversationsResult, pagination, query) => {
            conversations.setConversations(conversationsResult, pagination, query, token);
          },
          error => {
            console.error('❌ Erro ao recarregar filtros:', error);
          },
        );
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao recarregar filtros:', error);
    }
  }, [filters, conversations]);

  return {
    handleApplyFilters,
    handleClearFilters,
    reloadCurrentFilters,
  };
};
