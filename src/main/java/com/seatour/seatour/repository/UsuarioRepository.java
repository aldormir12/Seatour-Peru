package com.seatour.seatour.repository;

import com.seatour.seatour.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select u from Usuario u where u.id = :id")
    Optional<Usuario> bloquearPorId(@org.springframework.data.repository.query.Param("id") Long id);

    List<Usuario> findByRol_NombreIn(List<String> nombres);
    Optional<Usuario> findByCorreo(String correo);
    boolean existsByCorreo(String correo);
    boolean existsByRol_Nombre(String nombre);
}
