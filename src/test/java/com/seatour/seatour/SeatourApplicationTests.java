package com.seatour.seatour;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@org.springframework.test.context.ActiveProfiles("test")
@org.springframework.test.context.TestPropertySource(locations = "classpath:application-test.properties")
class SeatourApplicationTests {

	@Test
	void contextLoads() {
	}

}
